// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { ISchemaRegistry } from "./ISchemaRegistry.sol";
import { IEIP712Verifier } from "./IEIP712Verifier.sol";
import { EIP712Signature } from "./Types.sol";

/**
 * @dev A struct representing a single attestation.
 */
struct Attestation {
    bytes32 uuid; // A unique identifier of the attestation.
    bytes32 schema; // The unique identifier of the schema.
    bytes32 refUUID; // The UUID of the related attestation.
    uint32 time; // The time when the attestation was created (Unix timestamp).
    uint32 expirationTime; // The time when the attestation expires (Unix timestamp).
    uint32 revocationTime; // The time when the attestation was revoked (Unix timestamp).
    address recipient; // The recipient of the attestation.
    address attester; // The attester/sender of the attestation.
    bool revocable; // Whether the attestation is revocable.
    bytes data; // Custom attestation data.
}

/**
 * @dev A struct representing the arguments of the attestation request.
 */
struct AttestationRequestData {
    address recipient; // The recipient of the attestation.
    uint32 expirationTime; // The time when the attestation expires (Unix timestamp).
    bool revocable; // Whether the attestation is revocable.
    bytes32 refUUID; // The UUID of the related attestation.
    bytes data; // Custom attestation data.
    uint256 value; // An explicit ETH amount to send to the resolver. This is important to prevent accidental user errors.
}

/**
 * @dev A struct representing the full arguments of the attestation request.
 */
struct AttestationRequest {
    bytes32 schema; // The unique identifier of the schema.
    AttestationRequestData data; // The arguments of the attestation request.
}

/**
 * @dev A struct representing the full arguments of the full delegated attestation request.
 */
struct DelegatedAttestationRequest {
    bytes32 schema; // The unique identifier of the schema.
    AttestationRequestData data; // The arguments of the attestation request.
    EIP712Signature signature; // The EIP712 signature data.
    address attester; // The attesting account.
}

/**
 * @dev A struct representing the full arguments of the multi attestation request.
 */
struct MultiAttestationRequest {
    bytes32 schema; // The unique identifier of the schema.
    AttestationRequestData[] data; // The arguments of the attestation request.
}

/**
 * @dev A struct representing the full arguments of the delegated multi attestation request.
 */
struct MultiDelegatedAttestationRequest {
    bytes32 schema; // The unique identifier of the schema.
    AttestationRequestData[] data; // The arguments of the attestation requests.
    EIP712Signature[] signatures; // The EIP712 signatures data.
    address attester; // The attesting account.
}

/**
 * @dev A struct representing the arguments of the revocation request.
 */
struct RevocationRequestData {
    bytes32 uuid; // The UUID of the attestation to revoke.
    uint256 value; // An explicit ETH amount to send to the resolver. This is important to prevent accidental user errors.
}

/**
 * @dev A struct representing the full arguments of the revocation request.
 */
struct RevocationRequest {
    bytes32 schema; // The unique identifier of the schema.
    RevocationRequestData data; // The arguments of the revocation request.
}

/**
 * @dev A struct representing the arguments of the full delegated revocation request.
 */
struct DelegatedRevocationRequest {
    bytes32 schema; // The unique identifier of the schema.
    RevocationRequestData data; // The arguments of the revocation request.
    EIP712Signature signature; // The EIP712 signature data.
    address revoker; // The revoking account.
}

/**
 * @dev A struct representing the full arguments of the multi revocation request.
 */
struct MultiRevocationRequest {
    bytes32 schema; // The unique identifier of the schema.
    RevocationRequestData[] data; // The arguments of the revocation request.
}

/**
 * @dev A struct representing the full arguments of the delegated multi revocation request.
 */
struct MultiDelegatedRevocationRequest {
    bytes32 schema; // The unique identifier of the schema.
    RevocationRequestData[] data; // The arguments of the revocation requests.
    EIP712Signature[] signatures; // The EIP712 signatures data.
    address revoker; // The revoking account.
}

/**
 * @title EAS - Ethereum Attestation Service interface.
 */
interface IEAS {
    /**
     * @dev Triggered when an attestation has been made.
     *
     * @param recipient The recipient of the attestation.
     * @param attester The attesting account.
     * @param uuid The UUID the revoked attestation.
     * @param schema The UUID of the schema.
     */
    event Attested(address indexed recipient, address indexed attester, bytes32 uuid, bytes32 indexed schema);

    /**
     * @dev Triggered when an attestation has been revoked.
     *
     * @param recipient The recipient of the attestation.
     * @param attester The attesting account.
     * @param schema The UUID of the schema.
     * @param uuid The UUID the revoked attestation.
     */
    event Revoked(address indexed recipient, address indexed attester, bytes32 uuid, bytes32 indexed schema);

    /**
     * @dev Returns the address of the global schema registry.
     *
     * @return The address of the global schema registry.
     */
    function getSchemaRegistry() external view returns (ISchemaRegistry);

    /**
     * @dev Returns the address of the EIP712 verifier used to verify signed attestations.
     *
     * @return The address of the EIP712 verifier used to verify signed attestations.
     */
    function getEIP712Verifier() external view returns (IEIP712Verifier);

    /**
     * @dev Attests to a specific schema.
     *
     * @param request The arguments of the attestation request.
     *
     * @return The UUID of the new attestation.
     */
    function attest(AttestationRequest calldata request) external payable returns (bytes32);

    /**
     * @dev Attests to a specific schema via the provided EIP712 signature.
     *
     * @param delegatedRequest The arguments of the delegated attestation request.
     *
     * @return The UUID of the new attestation.
     */
    function attestByDelegation(
        DelegatedAttestationRequest calldata delegatedRequest
    ) external payable returns (bytes32);

    /**
     * @dev Attests to multiple schemas.
     *
     * @param multiRequests The arguments of the multi attestation requests. The requests should be grouped by distinct
     * schema ids to benefit from the best batching optimization.
     *
     * @return The UUIDs of the new attestations.
     */
    function multiAttest(MultiAttestationRequest[] calldata multiRequests) external payable returns (bytes32[] memory);

    /**
     * @dev Attests to multiple schemas using via provided EIP712 signatures.
     *
     * @param multiDelegatedRequests The arguments of the delegated multi attestation requests. The requests should be
     * grouped by distinct schema ids to benefit from the best batching optimization.
     *
     * @return The UUIDs of the new attestations.
     */
    function multiAttestByDelegation(
        MultiDelegatedAttestationRequest[] calldata multiDelegatedRequests
    ) external payable returns (bytes32[] memory);

    /**
     * @dev Revokes an existing attestation to a specific schema.
     *
     * @param request The arguments of the revocation request.
     */
    function revoke(RevocationRequest calldata request) external payable;

    /**
     * @dev Revokes an existing attestation to a specific schema via the provided EIP712 signature.
     *
     * @param delegatedRequest The arguments of the delegated revocation request.
     */
    function revokeByDelegation(DelegatedRevocationRequest calldata delegatedRequest) external payable;

    /**
     * @dev Revokes existing attestations to multiple schemas.
     *
     * @param multiRequests The arguments of the multi revocation requests. The requests should be grouped by distinct
     * schema ids to benefit from the best batching optimization.
     */
    function multiRevoke(MultiRevocationRequest[] calldata multiRequests) external payable;

    /**
     * @dev Revokes existing attestations to multiple schemas via provided EIP712 signatures.
     *
     * @param multiDelegatedRequests The arguments of the delegated multi revocation attestation requests. The requests should be
     * grouped by distinct schema ids to benefit from the best batching optimization.
     */
    function multiRevokeByDelegation(
        MultiDelegatedRevocationRequest[] calldata multiDelegatedRequests
    ) external payable;

    /**
     * @dev Returns an existing attestation by UUID.
     *
     * @param uuid The UUID of the attestation to retrieve.
     *
     * @return The attestation data members.
     */
    function getAttestation(bytes32 uuid) external view returns (Attestation memory);

    /**
     * @dev Checks whether an attestation exists.
     *
     * @param uuid The UUID of the attestation to retrieve.
     *
     * @return Whether an attestation exists.
     */
    function isAttestationValid(bytes32 uuid) external view returns (bool);
}
