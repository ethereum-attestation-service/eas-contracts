// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { EMPTY_UUID } from "./Types.sol";
import { IEAS, Attestation } from "./IEAS.sol";
import { ISchemaRegistry, SchemaRecord } from "./ISchemaRegistry.sol";
import { IEIP712Verifier } from "./IEIP712Verifier.sol";
import { ISchemaResolver } from "./ISchemaResolver.sol";

/**
 * @title EAS - Ethereum Attestation Service
 */
contract EAS is IEAS {
    error AccessDenied();
    error AlreadyRevoked();
    error InvalidAttestation();
    error InvalidExpirationTime();
    error InvalidOffset();
    error InvalidRegistry();
    error InvalidRevocation();
    error InvalidSchema();
    error InvalidVerifier();
    error NotFound();
    error NotPayable();

    // The version of the contract.
    string public constant VERSION = "0.14";

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
    function attest(
        address recipient,
        bytes32 schema,
        uint32 expirationTime,
        bytes32 refUUID,
        bytes calldata data
    ) public payable virtual returns (bytes32) {
        return _attest(recipient, schema, expirationTime, refUUID, data, msg.sender);
    }

    /**
     * @inheritdoc IEAS
     */
    function attestByDelegation(
        address recipient,
        bytes32 schema,
        uint32 expirationTime,
        bytes32 refUUID,
        bytes calldata data,
        address attester,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public payable virtual returns (bytes32) {
        _eip712Verifier.attest(recipient, schema, expirationTime, refUUID, data, attester, v, r, s);

        return _attest(recipient, schema, expirationTime, refUUID, data, attester);
    }

    /**
     * @inheritdoc IEAS
     */
    function revoke(bytes32 uuid) public virtual {
        return _revoke(uuid, msg.sender);
    }

    /**
     * @inheritdoc IEAS
     */
    function revokeByDelegation(
        bytes32 uuid,
        address attester,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        _eip712Verifier.revoke(uuid, attester, v, r, s);

        _revoke(uuid, attester);
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
     * @param recipient The recipient of the attestation.
     * @param schema The UUID of the schema.
     * @param expirationTime The expiration time of the attestation (0 represents no expiration).
     * @param refUUID An optional related attestation's UUID.
     * @param data Additional custom data.
     * @param attester The attesting account.
     *
     * @return The UUID of the new attestation.
     */
    function _attest(
        address recipient,
        bytes32 schema,
        uint32 expirationTime,
        bytes32 refUUID,
        bytes calldata data,
        address attester
    ) private returns (bytes32) {
        if (expirationTime != 0 && expirationTime <= _time()) {
            revert InvalidExpirationTime();
        }

        SchemaRecord memory schemaRecord = _schemaRegistry.getSchema(schema);
        if (schemaRecord.uuid == EMPTY_UUID) {
            revert InvalidSchema();
        }

        Attestation memory attestation = Attestation({
            uuid: EMPTY_UUID,
            schema: schema,
            refUUID: refUUID,
            time: _time(),
            expirationTime: expirationTime,
            revocationTime: 0,
            recipient: recipient,
            attester: attester,
            data: data
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

        _resolveAttestation(schemaRecord, attestation, false);

        _db[uuid] = attestation;

        if (refUUID != 0) {
            if (!isAttestationValid(refUUID)) {
                revert NotFound();
            }
        }

        emit Attested(recipient, attester, uuid, schema);

        return uuid;
    }

    /**
     * @dev Revokes an existing attestation to a specific schema.
     *
     * @param uuid The UUID of the attestation to revoke.
     * @param attester The attesting account.
     */
    function _revoke(bytes32 uuid, address attester) private {
        Attestation storage attestation = _db[uuid];
        if (attestation.uuid == EMPTY_UUID) {
            revert NotFound();
        }

        if (attestation.attester != attester) {
            revert AccessDenied();
        }

        if (attestation.revocationTime != 0) {
            revert AlreadyRevoked();
        }

        attestation.revocationTime = _time();

        _resolveAttestation(_schemaRegistry.getSchema(attestation.schema), attestation, true);

        emit Revoked(attestation.recipient, attester, uuid, attestation.schema);
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
                    attestation.data,
                    bump
                )
            );
    }

    /**
     * @dev Resolves a new attestation or a revocation of an existing revocation
     *
     * @param schemaRecord The schema of the attestation.
     * @param attestation The data of attestation.
     * @param isRevocation Whether to resolve an attestation or its revocation.
     */
    function _resolveAttestation(
        SchemaRecord memory schemaRecord,
        Attestation memory attestation,
        bool isRevocation
    ) private {
        ISchemaResolver resolver = schemaRecord.resolver;
        if (address(resolver) == address(0)) {
            return;
        }

        if (msg.value != 0 && !resolver.isPayable()) {
            revert NotPayable();
        }

        if (isRevocation) {
            if (!resolver.revoke{ value: msg.value }(attestation)) {
                revert InvalidRevocation();
            }

            return;
        }

        if (!resolver.attest{ value: msg.value }(attestation)) {
            revert InvalidAttestation();
        }
    }

    /**
     * @dev Returns the current's block timestamp.
     */
    function _time() internal view virtual returns (uint32) {
        return uint32(block.timestamp);
    }
}
