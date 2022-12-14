// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import { EMPTY_UUID } from "./Types.sol";
import { IEAS, Attestation, AttestationRequest, DelegatedAttestationRequest, RevocationRequest, DelegatedRevocationRequest } from "./IEAS.sol";
import { ISchemaRegistry, SchemaRecord } from "./ISchemaRegistry.sol";
import { IEIP712Verifier } from "./IEIP712Verifier.sol";

import { ISchemaResolver } from "./resolver/ISchemaResolver.sol";

/**
 * @title EAS - Ethereum Attestation Service
 */
contract EAS is IEAS {
    using Address for address payable;

    error AccessDenied();
    error AlreadyRevoked();
    error InsufficientValue();
    error InvalidAttestation();
    error InvalidExpirationTime();
    error InvalidOffset();
    error InvalidRegistry();
    error InvalidRevocation();
    error InvalidSchema();
    error InvalidVerifier();
    error Irrevocable();
    error NotFound();
    error NotPayable();

    // The version of the contract.
    string public constant VERSION = "0.21";

    // The global schema registry.
    ISchemaRegistry private immutable _schemaRegistry;

    // The EIP712 verifier used to verify signed attestations.
    IEIP712Verifier private immutable _eip712Verifier;

    // The global mapping between attestations and their UUIDs.
    mapping(bytes32 => Attestation) private _db;

    /**
     * @dev Creates a new EAS instance.
     *
     * @param registry The address of the global schema registry.
     * @param verifier The address of the EIP712 verifier.
     */
    constructor(ISchemaRegistry registry, IEIP712Verifier verifier) {
        if (address(registry) == address(0)) {
            revert InvalidRegistry();
        }

        if (address(verifier) == address(0)) {
            revert InvalidVerifier();
        }

        _schemaRegistry = registry;
        _eip712Verifier = verifier;
    }

    /**
     * @inheritdoc IEAS
     */
    function getSchemaRegistry() external view returns (ISchemaRegistry) {
        return _schemaRegistry;
    }

    /**
     * @inheritdoc IEAS
     */
    function getEIP712Verifier() external view returns (IEIP712Verifier) {
        return _eip712Verifier;
    }

    /**
     * @inheritdoc IEAS
     */
    function attest(AttestationRequest calldata request) public payable virtual returns (bytes32) {
        return _attest(request, msg.sender, msg.value);
    }

    /**
     * @inheritdoc IEAS
     */
    function attestByDelegation(
        DelegatedAttestationRequest calldata delegatedRequest
    ) public payable virtual returns (bytes32) {
        _eip712Verifier.attest(delegatedRequest);

        return _attest(delegatedRequest.request, delegatedRequest.signature.attester, msg.value);
    }

    /**
     * @inheritdoc IEAS
     */
    function revoke(RevocationRequest calldata request) public payable virtual {
        return _revoke(request, msg.sender, msg.value);
    }

    /**
     * @inheritdoc IEAS
     */
    function revokeByDelegation(DelegatedRevocationRequest calldata delegatedRequest) public payable virtual {
        _eip712Verifier.revoke(delegatedRequest);

        _revoke(delegatedRequest.request, delegatedRequest.signature.attester, msg.value);
    }

    /**
     * @inheritdoc IEAS
     */
    function getAttestation(bytes32 uuid) external view returns (Attestation memory) {
        return _db[uuid];
    }

    /**
     * @inheritdoc IEAS
     */
    function isAttestationValid(bytes32 uuid) public view returns (bool) {
        return _db[uuid].uuid != 0;
    }

    /**
     * @dev Attests to a specific schema.
     *
     * @param request The arguments of the attestation request.
     * @param attester The attesting account.
     * @param remainingValue The remaining msg.value ETH that is available to make this attestation (in case it's a
     * payable attestation)
     *
     * @return The UUID of the new attestation.
     */
    function _attest(
        AttestationRequest calldata request,
        address attester,
        uint256 remainingValue
    ) private returns (bytes32) {
        if (request.expirationTime != 0 && request.expirationTime <= _time()) {
            revert InvalidExpirationTime();
        }

        SchemaRecord memory schemaRecord = _schemaRegistry.getSchema(request.schema);
        if (schemaRecord.uuid == EMPTY_UUID) {
            revert InvalidSchema();
        }

        if (!schemaRecord.revocable && request.revocable) {
            revert Irrevocable();
        }

        Attestation memory attestation = Attestation({
            uuid: EMPTY_UUID,
            schema: request.schema,
            refUUID: request.refUUID,
            time: _time(),
            expirationTime: request.expirationTime,
            revocationTime: 0,
            recipient: request.recipient,
            attester: attester,
            revocable: request.revocable,
            data: request.data
        });

        // Look for the first non-existing UUID (and use a bump seed/nonce in the rare case of a conflict).
        bytes32 uuid;
        uint32 bump = 0;
        while (true) {
            uuid = _getUUID(attestation, bump);
            if (_db[uuid].uuid == EMPTY_UUID) {
                break;
            }

            unchecked {
                ++bump;
            }
        }
        attestation.uuid = uuid;

        _resolveAttestation(schemaRecord, attestation, false, request.value, remainingValue, true);

        _db[uuid] = attestation;

        if (request.refUUID != 0) {
            if (!isAttestationValid(request.refUUID)) {
                revert NotFound();
            }
        }

        emit Attested(request.recipient, attester, uuid, request.schema);

        return uuid;
    }

    /**
     * @dev Revokes an existing attestation to a specific schema.
     *
     * @param request The arguments of the revocation request.
     * @param revoker The revoking account.
     * @param remainingValue The remaining msg.value ETH that is available to make this attestation (in case it's a
     * payable revocation)
     */
    function _revoke(RevocationRequest calldata request, address revoker, uint256 remainingValue) private {
        Attestation storage attestation = _db[request.uuid];
        if (attestation.uuid == EMPTY_UUID) {
            revert NotFound();
        }

        if (attestation.attester != revoker) {
            revert AccessDenied();
        }

        // Please note that also checking of the schema itself is revocable is unnecessary, since it's not possible to
        // make revocable attestations to an irrevocable schema.
        if (!attestation.revocable) {
            revert Irrevocable();
        }

        if (attestation.revocationTime != 0) {
            revert AlreadyRevoked();
        }

        attestation.revocationTime = _time();

        SchemaRecord memory schemaRecord = _schemaRegistry.getSchema(attestation.schema);
        _resolveAttestation(schemaRecord, attestation, true, request.value, remainingValue, true);

        emit Revoked(attestation.recipient, revoker, request.uuid, attestation.schema);
    }

    /**
     * @dev Resolves a new attestation or a revocation of an existing revocation
     *
     * @param schemaRecord The schema of the attestation.
     * @param attestation The data of attestation.
     * @param isRevocation Whether to resolve an attestation or its revocation.
     * @param value An explicit ETH value to send to the resolver. This is important to prevent accidental user errors.
     * @param remainingValue The remaining msg.value ETH that is available to make this attestation (in case it's a
     * payable attestation)
     * @param refund Whether to refund any remaining msg.value ETH that was provided. Refunding must happen whether it's
     * a single attestation/revocation or if it's the last attestation/revocation in a batch.
     */
    function _resolveAttestation(
        SchemaRecord memory schemaRecord,
        Attestation memory attestation,
        bool isRevocation,
        uint256 value,
        uint256 remainingValue,
        bool refund
    ) private {
        ISchemaResolver resolver = schemaRecord.resolver;
        if (address(resolver) == address(0)) {
            return;
        }

        if (value != 0 && !resolver.isPayable()) {
            revert NotPayable();
        }

        if (value > remainingValue) {
            revert InsufficientValue();
        }

        if (isRevocation) {
            if (!resolver.revoke{ value: value }(attestation)) {
                revert InvalidRevocation();
            }
        } else if (!resolver.attest{ value: value }(attestation)) {
            revert InvalidAttestation();
        }

        // Refund any remaining ETH back to the attester.
        if (!refund) {
            return;
        }

        unchecked {
            uint256 refundAmount = msg.value - value;
            if (refundAmount > 0) {
                // Using a regular transfer here might revert, for some non-EOA attesters, due to exceeding of the 2300
                // gas limit which is why we're using call instead (via sendValue), which the 2300 gas limit does not
                // apply for.
                payable(msg.sender).sendValue(refundAmount);
            }
        }
    }

    /**
     * @dev Calculates a UUID for a given attestation.
     *
     * @param attestation The input attestation.
     * @param bump A bump value to use in case of a UUID conflict.
     *
     * @return Attestation UUID.
     */
    function _getUUID(Attestation memory attestation, uint32 bump) private pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    attestation.schema,
                    attestation.recipient,
                    attestation.attester,
                    attestation.time,
                    attestation.expirationTime,
                    attestation.revocable,
                    attestation.refUUID,
                    attestation.data,
                    bump
                )
            );
    }

    /**
     * @dev Returns the current's block timestamp.
     */
    function _time() internal view virtual returns (uint32) {
        return uint32(block.timestamp);
    }
}
