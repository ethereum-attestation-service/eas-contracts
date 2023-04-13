// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ISchemaRegistry } from "./ISchemaRegistry.sol";
import { Attestation, EIP712Signature } from "./Common.sol";

/**
 * @dev A struct representing the arguments of the attestation request.
 */
struct AttestationRequestData {
    address recipient; // The recipient of the attestation.
    uint64 expirationTime; // The time when the attestation expires (Unix timestamp).
    bool revocable; // Whether the attestation is revocable.
    bytes32 refUID; // The UID of the related attestation.
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
 * @dev A struct representing the full arguments of the multi attestation request.
 */
struct MultiAttestationRequest {
    bytes32 schema; // The unique identifier of the schema.
    AttestationRequestData[] data; // The arguments of the attestation request.
}

/**
 * @dev A struct representing the arguments of the revocation request.
 */
struct RevocationRequestData {
    bytes32 uid; // The UID of the attestation to revoke.
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
 * @dev A struct representing the full arguments of the multi revocation request.
 */
struct MultiRevocationRequest {
    bytes32 schema; // The unique identifier of the schema.
    RevocationRequestData[] data; // The arguments of the revocation request.
}

/**
 * @title IEAS - Ethereum Attestation Service interface.
 */
interface IEAS {
    /**
     * @dev Emitted when an attestation has been made.
     *
     * @param recipient The recipient of the attestation.
     * @param attester The attesting account.
     * @param uid The UID the revoked attestation.
     * @param schema The UID of the schema.
     */
    event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schema);

    /**
     * @dev Emitted when an attestation has been revoked.
     *
     * @param recipient The recipient of the attestation.
     * @param attester The attesting account.
     * @param schema The UID of the schema.
     * @param uid The UID the revoked attestation.
     */
    event Revoked(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schema);

    /**
     * @dev Emitted when a data has been timestamped.
     *
     * @param data The data.
     * @param timestamp The timestamp.
     */
    event Timestamped(bytes32 indexed data, uint64 indexed timestamp);

    /**
     * @dev Emitted when a data has been revoked.
     *
     * @param revoker The address of the revoker.
     * @param data The data.
     * @param timestamp The timestamp.
     */
    event RevokedOffchain(address indexed revoker, bytes32 indexed data, uint64 indexed timestamp);

    /**
     * @dev Returns the address of the global schema registry.
     *
     * @return The address of the global schema registry.
     */
    function getSchemaRegistry() external view returns (ISchemaRegistry);

    /**
     * @dev Attests to a specific schema.
     *
     * @param request The arguments of the attestation request.
     *
     * Example:
     *
     * attest({
     *     schema: "0facc36681cbe2456019c1b0d1e7bedd6d1d40f6f324bf3dd3a4cef2999200a0",
     *     data: {
     *         recipient: "0xdEADBeAFdeAdbEafdeadbeafDeAdbEAFdeadbeaf",
     *         expirationTime: 0,
     *         revocable: true,
     *         refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
     *         data: "0xF00D",
     *         value: 0
     *     }
     * })
     *
     * @return The UID of the new attestation.
     */
    function attest(AttestationRequest calldata request) external payable returns (bytes32);

    /**
     * @dev Attests to multiple schemas.
     *
     * @param multiRequests The arguments of the multi attestation requests. The requests should be grouped by distinct
     * schema ids to benefit from the best batching optimization.
     *
     * Example:
     *
     * multiAttest([{
     *     schema: '0x33e9094830a5cba5554d1954310e4fbed2ef5f859ec1404619adea4207f391fd',
     *     data: [{
     *         recipient: '0xdEADBeAFdeAdbEafdeadbeafDeAdbEAFdeadbeaf',
     *         expirationTime: 1673891048,
     *         revocable: true,
     *         refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
     *         data: '0x1234',
     *         value: 1000
     *     },
     *     {
     *         recipient: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
     *         expirationTime: 0,
     *         revocable: false,
     *         refUID: '0x480df4a039efc31b11bfdf491b383ca138b6bde160988222a2a3509c02cee174',
     *         data: '0x00',
     *         value: 0
     *     }],
     * },
     * {
     *     schema: '0x5ac273ce41e3c8bfa383efe7c03e54c5f0bff29c9f11ef6ffa930fc84ca32425',
     *     data: [{
     *         recipient: '0xdEADBeAFdeAdbEafdeadbeafDeAdbEAFdeadbeaf',
     *         expirationTime: 0,
     *         revocable: true,
     *         refUID: '0x75bf2ed8dca25a8190c50c52db136664de25b2449535839008ccfdab469b214f',
     *         data: '0x12345678',
     *         value: 0
     *     },
     * }])
     *
     * @return The UIDs of the new attestations.
     */
    function multiAttest(MultiAttestationRequest[] calldata multiRequests) external payable returns (bytes32[] memory);

    /**
     * @dev Revokes an existing attestation to a specific schema.
     *
     * Example:
     *
     * revoke({
     *     schema: '0x8e72f5bc0a8d4be6aa98360baa889040c50a0e51f32dbf0baa5199bd93472ebc',
     *     data: {
     *         uid: '0x101032e487642ee04ee17049f99a70590c735b8614079fc9275f9dd57c00966d',
     *         value: 0
     *     }
     * })
     *
     * @param request The arguments of the revocation request.
     */
    function revoke(RevocationRequest calldata request) external payable;

    /**
     * @dev Revokes existing attestations to multiple schemas.
     *
     * @param multiRequests The arguments of the multi revocation requests. The requests should be grouped by distinct
     * schema ids to benefit from the best batching optimization.
     *
     * Example:
     *
     * multiRevoke([{
     *     schema: '0x8e72f5bc0a8d4be6aa98360baa889040c50a0e51f32dbf0baa5199bd93472ebc',
     *     data: [{
     *         uid: '0x211296a1ca0d7f9f2cfebf0daaa575bea9b20e968d81aef4e743d699c6ac4b25',
     *         value: 1000
     *     },
     *     {
     *         uid: '0xe160ac1bd3606a287b4d53d5d1d6da5895f65b4b4bab6d93aaf5046e48167ade',
     *         value: 0
     *     }],
     * },
     * {
     *     schema: '0x5ac273ce41e3c8bfa383efe7c03e54c5f0bff29c9f11ef6ffa930fc84ca32425',
     *     data: [{
     *         uid: '0x053d42abce1fd7c8fcddfae21845ad34dae287b2c326220b03ba241bc5a8f019',
     *         value: 0
     *     },
     * }])
     */
    function multiRevoke(MultiRevocationRequest[] calldata multiRequests) external payable;

    /**
     * @dev Timestamps the specified bytes32 data.
     *
     * @param data The data to timestamp.
     *
     * @return The timestamp the data was timestamped with.
     */
    function timestamp(bytes32 data) external returns (uint64);

    /**
     * @dev Timestamps the specified multiple bytes32 data.
     *
     * @param data The data to timestamp.
     *
     * @return The timestamp the data was timestamped with.
     */
    function multiTimestamp(bytes32[] calldata data) external returns (uint64);

    /**
     * @dev Revokes the specified bytes32 data.
     *
     * @param data The data to timestamp.
     *
     * @return The timestamp the data was revoked with.
     */
    function revokeOffchain(bytes32 data) external returns (uint64);

    /**
     * @dev Revokes the specified multiple bytes32 data.
     *
     * @param data The data to timestamp.
     *
     * @return The timestamp the data was revoked with.
     */
    function multiRevokeOffchain(bytes32[] calldata data) external returns (uint64);

    /**
     * @dev Returns an existing attestation by UID.
     *
     * @param uid The UID of the attestation to retrieve.
     *
     * @return The attestation data members.
     */
    function getAttestation(bytes32 uid) external view returns (Attestation memory);

    /**
     * @dev Checks whether an attestation exists.
     *
     * @param uid The UID of the attestation to retrieve.
     *
     * @return Whether an attestation exists.
     */
    function isAttestationValid(bytes32 uid) external view returns (bool);

    /**
     * @dev Returns the timestamp that the specified data was timestamped with.
     *
     * @param data The data to query.
     *
     * @return The timestamp the data was timestamped with.
     */
    function getTimestamp(bytes32 data) external view returns (uint64);

    /**
     * @dev Returns the timestamp that the specified data was timestamped with.
     *
     * @param data The data to query.
     *
     * @return The timestamp the data was timestamped with.
     */
    function getRevokeOffchain(address revoker, bytes32 data) external view returns (uint64);
}
