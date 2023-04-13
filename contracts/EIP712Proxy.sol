// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import { EIP712Signature, InvalidEAS, InvalidLength, InvalidSignature, mergeUIDs } from "./Common.sol";

// prettier-ignore
import {
    AttestationRequest,
    AttestationRequestData,
    IEAS,
    MultiAttestationRequest,
    MultiRevocationRequest,
    RevocationRequest,
    RevocationRequestData
} from "./IEAS.sol";

// prettier-ignore
import {
    DelegatedAttestationRequest,
    DelegatedRevocationRequest,
    IEASDelegated,
    MultiDelegatedAttestationRequest,
    MultiDelegatedRevocationRequest
} from "./IEASDelegated.sol";

/**
 * @title This utility contract an be used to aggregate delegated attestations without requiring a specific order via
 * nonces. The contract doesn't request nonces and implements replay protection by storing ***immalleable*** signatures.
 */
contract EIP712Proxy is IEASDelegated, EIP712 {
    error UsedSignature();

    // The version of the contract.
    string public constant VERSION = "0.1";

    // The hash of the data type used to relay calls to the attest function. It's the value of
    // keccak256("Attest(bytes32 schema,address recipient,uint64 expirationTime,bool revocable,bytes32 refUID,bytes data)").
    bytes32 private constant ATTEST_PROXY_TYPEHASH = 0x8c11201ed552a4177c87ea675a52654f9dd32ea6ace0bbeb037d34bb611ee1fc;

    // The hash of the data type used to relay calls to the revoke function. It's the value of
    // keccak256("Revoke(bytes32 schema,bytes32 uid)").
    bytes32 private constant REVOKE_PROXY_TYPEHASH = 0xdc23018b5389688383999ae597f15ae78aad1caf31fce36e306dbc7b8349ee3c;

    // The global EAS contract.
    IEAS private immutable _eas;

    // The user readable name of the signing domain.
    string private _name;

    // Replay protection signatures.
    mapping(bytes => bool) private _signatures;

    /**
     * @dev Creates a new EIP712Verifier instance.
     *
     * @param eas The address of the global EAS contract.
     * @param name The user readable name of the signing domain.
     */
    constructor(IEAS eas, string memory name) EIP712(name, VERSION) {
        if (address(eas) == address(0)) {
            revert InvalidEAS();
        }

        _eas = eas;
        _name = name;
    }

    /**
     * @dev Returns the domain separator used in the encoding of the signatures for attest, and revoke.
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * Returns the EIP712 type hash for the attest function.
     */
    function getAttestTypeHash() external pure returns (bytes32) {
        return ATTEST_PROXY_TYPEHASH;
    }

    /**
     * Returns the EIP712 type hash for the revoke function.
     */
    function getRevokeTypeHash() external pure returns (bytes32) {
        return REVOKE_PROXY_TYPEHASH;
    }

    /**
     * Returns the EIP712 name.
     */
    function getName() external view returns (string memory) {
        return _name;
    }

    /**
     * @inheritdoc IEASDelegated
     */
    function attestByDelegation(
        DelegatedAttestationRequest calldata delegatedRequest
    ) public payable virtual returns (bytes32) {
        _verifyAttest(delegatedRequest);

        return
            _eas.attest{ value: msg.value }(
                AttestationRequest({ schema: delegatedRequest.schema, data: delegatedRequest.data })
            );
    }

    /**
     * @inheritdoc IEASDelegated
     */
    function multiAttestByDelegation(
        MultiDelegatedAttestationRequest[] calldata multiDelegatedRequests
    ) external payable returns (bytes32[] memory) {
        // Since a multi-attest call is going to make multiple attestations for multiple schemas, we'd need to collect
        // all the returned UIDs into a single list.
        bytes32[][] memory totalUids = new bytes32[][](multiDelegatedRequests.length);
        uint256 totalUidsCount = 0;

        for (uint256 i = 0; i < multiDelegatedRequests.length; ) {
            // The last batch is handled slightly differently: if the total available ETH wasn't spent in full and there
            // is a remainder - it will be refunded back to the attester (something that we can only verify during the
            // last and final batch).
            bool last;
            unchecked {
                last = i == multiDelegatedRequests.length - 1;
            }

            MultiDelegatedAttestationRequest calldata multiDelegatedRequest = multiDelegatedRequests[i];
            AttestationRequestData[] calldata data = multiDelegatedRequest.data;

            // Ensure that no inputs are missing.
            if (data.length == 0 || data.length != multiDelegatedRequest.signatures.length) {
                revert InvalidLength();
            }

            MultiAttestationRequest[] memory multiRequests = new MultiAttestationRequest[](data.length);
            uint256 value = 0;

            // Verify EIP712 signatures. Please note that the signatures are assumed to be signed with increasing nonces.
            for (uint256 j = 0; j < data.length; ) {
                AttestationRequestData memory requestData = data[j];

                _verifyAttest(
                    DelegatedAttestationRequest({
                        schema: multiDelegatedRequest.schema,
                        data: requestData,
                        signature: multiDelegatedRequest.signatures[j],
                        attester: multiDelegatedRequest.attester
                    })
                );

                multiRequests[i] = MultiAttestationRequest({ schema: multiDelegatedRequest.schema, data: data });
                value += requestData.value;

                unchecked {
                    ++j;
                }
            }

            // Collect UIDs (and merge them later).
            totalUids[i] = _eas.multiAttest{ value: value }(multiRequests);

            unchecked {
                totalUidsCount += totalUids[i].length;

                ++i;
            }
        }

        // Merge all the collected UIDs and return them as a flatten array.
        return mergeUIDs(totalUids, totalUidsCount);
    }

    /**
     * @inheritdoc IEASDelegated
     */
    function revokeByDelegation(DelegatedRevocationRequest calldata delegatedRequest) public payable virtual {
        _verifyRevoke(delegatedRequest);

        return
            _eas.revoke{ value: msg.value }(
                RevocationRequest({ schema: delegatedRequest.schema, data: delegatedRequest.data })
            );
    }

    /**
     * @inheritdoc IEASDelegated
     */
    function multiRevokeByDelegation(
        MultiDelegatedRevocationRequest[] calldata multiDelegatedRequests
    ) external payable {
        for (uint256 i = 0; i < multiDelegatedRequests.length; ) {
            // The last batch is handled slightly differently: if the total available ETH wasn't spent in full and there
            // is a remainder - it will be refunded back to the attester (something that we can only verify during the
            // last and final batch).
            bool last;
            unchecked {
                last = i == multiDelegatedRequests.length - 1;
            }

            MultiDelegatedRevocationRequest memory multiDelegatedRequest = multiDelegatedRequests[i];
            RevocationRequestData[] memory data = multiDelegatedRequest.data;

            // Ensure that no inputs are missing.
            if (data.length == 0 || data.length != multiDelegatedRequest.signatures.length) {
                revert InvalidLength();
            }

            MultiRevocationRequest[] memory multiRequests = new MultiRevocationRequest[](data.length);
            uint256 value = 0;

            // Verify EIP712 signatures. Please note that the signatures are assumed to be signed with increasing nonces.
            for (uint256 j = 0; j < data.length; ) {
                RevocationRequestData memory requestData = data[j];

                _verifyRevoke(
                    DelegatedRevocationRequest({
                        schema: multiDelegatedRequest.schema,
                        data: requestData,
                        signature: multiDelegatedRequest.signatures[j],
                        revoker: multiDelegatedRequest.revoker
                    })
                );

                multiRequests[i] = MultiRevocationRequest({ schema: multiDelegatedRequest.schema, data: data });
                value += requestData.value;

                unchecked {
                    ++j;
                }
            }

            _eas.multiRevoke{ value: value }(multiRequests);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Verifies delegated attestation request.
     *
     * @param request The arguments of the delegated attestation request.
     */
    function _verifyAttest(DelegatedAttestationRequest memory request) internal {
        AttestationRequestData memory data = request.data;
        EIP712Signature memory signature = request.signature;

        _verifyUnusedSignature(signature);

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ATTEST_PROXY_TYPEHASH,
                    request.schema,
                    data.recipient,
                    data.expirationTime,
                    data.revocable,
                    data.refUID,
                    keccak256(data.data)
                )
            )
        );

        if (ECDSA.recover(digest, signature.v, signature.r, signature.s) != request.attester) {
            revert InvalidSignature();
        }
    }

    /**
     * @dev Verifies delegated revocation request.
     *
     * @param request The arguments of the delegated revocation request.
     */
    function _verifyRevoke(DelegatedRevocationRequest memory request) internal {
        RevocationRequestData memory data = request.data;
        EIP712Signature memory signature = request.signature;

        _verifyUnusedSignature(signature);

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(REVOKE_PROXY_TYPEHASH, request.schema, data.uid)));

        if (ECDSA.recover(digest, signature.v, signature.r, signature.s) != request.revoker) {
            revert InvalidSignature();
        }
    }

    /**
     * @dev Ensures that the provided EIP712 signature wasn't already used.
     *
     * @param signature The EIP712 signature data.
     */
    function _verifyUnusedSignature(EIP712Signature memory signature) internal {
        bytes memory packedSignature = abi.encodePacked(signature.v, signature.r, signature.s);

        if (_signatures[packedSignature]) {
            revert UsedSignature();
        }

        _signatures[packedSignature] = true;
    }
}
