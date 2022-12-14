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
    bytes32 schema; // A unique identifier of the schema.
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
struct AttestationRequest {
    address recipient; // The recipient of the attestation.
    bytes32 schema; // A unique identifier of the schema.
    uint32 expirationTime; // The time when the attestation expires (Unix timestamp).
    bool revocable; // Whether the attestation is revocable.
    bytes32 refUUID; // The UUID of the related attestation.
    bytes data; // Custom attestation data.
    uint256 value; // value An explicit ETH value to send to the resolver. This is important to prevent accidental user errors.
}

/**
 * @dev A struct representing the arguments of the delegated attestation request.
 */
struct DelegatedAttestationRequest {
    AttestationRequest request; // The arguments to the attestation request.
    EIP712Signature signature; // The EIP712 signature data.
}

/**
 * @dev A struct representing the arguments of the revocation request.
 */
struct RevocationRequest {
    bytes32 uuid; // The UUID of the attestation to revoke.
    uint256 value; // An explicit ETH value to send to the resolver. This is important to prevent accidental user errors.
}

/**
 * @dev A struct representing the arguments of the delegated revocation request.
 */
struct DelegatedRevocationRequest {
    RevocationRequest request; // The arguments to the attestation request.
    EIP712Signature signature; // The EIP712 signature data.
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
     * @param request The arguments of the attestation request (see the AttestationRequest struct):
     *   - recipient: the recipient of the attestation.
     *   - schema: the UUID of the schema.
     *   - expirationTime: the expiration time of the attestation.
     *   - revocable: whether the attestation is revocable.
     *   - refUUID: an optional related attestation's UUID.
     *   - data: additional custom data.
     *   - value an explicit ETH value to send to the resolver. This is important to prevent accidental user errors.
     * @return The UUID of the new attestation.
     */
    function attest(AttestationRequest calldata request) external payable returns (bytes32);

    /**
     * @dev Attests to a specific schema using the provided EIP712 signature.
     *
     * @param delegatedRequest The arguments of the delegated attestation request (see the AttestationRequest struct):
     *   - request: the arguments to the attestation request.
     *   - signature: the EIP712 signature data.
     * @return The UUID of the new attestation.
     */
    function attestByDelegation(
        DelegatedAttestationRequest calldata delegatedRequest
    ) external payable returns (bytes32);

    /**
     * @dev Revokes an existing attestation to a specific schema.
     *
     * @param request The arguments of the revocation request (see the RevocationRequest struct):
     * - uuid: the UUID of the attestation to revoke.
     * - value: an explicit ETH value to send to the resolver. This is important to prevent accidental user errors.
     */
    function revoke(RevocationRequest calldata request) external payable;

    /**
     * @dev Revokes an existing attestation to a specific schema using the provided EIP712 signature.
     *
     * @param delegatedRequest The arguments of the delegated attestation request (see the DelegatedRevocationRequest struct):
     *   - request: arguments of the revocation request
     *   - signature: the EIP712 signature data.
     */
    function revokeByDelegation(DelegatedRevocationRequest calldata delegatedRequest) external payable;

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
