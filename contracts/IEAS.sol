// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { ISchemaRegistry } from "./ISchemaRegistry.sol";
import { IEIP712Verifier } from "./IEIP712Verifier.sol";

/**
 * @dev A struct representing a single attestation.
 */
struct Attestation {
    // A unique identifier of the attestation.
    bytes32 uuid;
    // A unique identifier of the schema.
    bytes32 schema;
    // The UUID of the related attestation.
    bytes32 refUUID;
    // The time when the attestation was created (Unix timestamp).
    uint32 time;
    // The time when the attestation expires (Unix timestamp).
    uint32 expirationTime;
    // The time when the attestation was revoked (Unix timestamp).
    uint32 revocationTime;
    // The recipient of the attestation.
    address recipient;
    // The attester/sender of the attestation.
    address attester;
    // Whether the attestation is revocable.
    bool revocable;
    // Custom attestation data.
    bytes data;
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
     * @param recipient The recipient of the attestation.
     * @param schema The UUID of the schema.
     * @param expirationTime The expiration time of the attestation.
     * @param revocable Whether the attestation is revocable.
     * @param refUUID An optional related attestation's UUID.
     * @param data Additional custom data.
     * @param value An explicit ETH value to send to the resolver. This is important to prevent accidental user errors.
     *
     * @return The UUID of the new attestation.
     */
    function attest(
        address recipient,
        bytes32 schema,
        uint32 expirationTime,
        bool revocable,
        bytes32 refUUID,
        bytes calldata data,
        uint256 value
    ) external payable returns (bytes32);

    /**
     * @dev Attests to a specific schema using the provided EIP712 signature.
     *
     * @param recipient The recipient of the attestation.
     * @param schema The UUID of the schema.
     * @param expirationTime The expiration time of the attestation.
     * @param revocable Whether the attestation is revocable.
     * @param refUUID An optional related attestation's UUID.
     * @param data Additional custom data.
     * @param value An explicit ETH value to send to the resolver. This is important to prevent accidental user errors.
     * @param attester The attesting account.
     * @param v The recovery ID.
     * @param r The x-coordinate of the nonce R.
     * @param s The signature data.
     *
     * @return The UUID of the new attestation.
     */
    function attestByDelegation(
        address recipient,
        bytes32 schema,
        uint32 expirationTime,
        bool revocable,
        bytes32 refUUID,
        bytes calldata data,
        uint256 value,
        address attester,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable returns (bytes32);

    /**
     * @dev Revokes an existing attestation to a specific schema.
     *
     * @param uuid The UUID of the attestation to revoke.
     * @param value An explicit ETH value to send to the resolver. This is important to prevent accidental user errors.
     */
    function revoke(bytes32 uuid, uint256 value) external payable;

    /**
     * @dev Attests to a specific schema the EIP712 signature.
     *
     * @param uuid The UUID of the attestation to revoke.
     * @param value An explicit ETH value to send to the resolver. This is important to prevent accidental user errors.
     * @param attester The attesting account.
     * @param v The recovery ID.
     * @param r The x-coordinate of the nonce R.
     * @param s The signature data.
     */
    function revokeByDelegation(
        bytes32 uuid,
        uint256 value,
        address attester,
        uint8 v,
        bytes32 r,
        bytes32 s
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
