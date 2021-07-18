// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;
pragma abicoder v2;

import "./IAORegistry.sol";
import "./IEIP712Verifier.sol";

/**
 * @dev A data struct representing a single attestation.
 */
struct Attestation {
    bytes32 uuid;
    bytes32 ao;
    address to;
    address from;
    uint256 time;
    uint256 expirationTime;
    uint256 revocationTime;
    bytes32 refUUID;
    bytes data;
}

/**
 * @title EAS - Ethereum Attestation Service interface
 */
interface IEAS {
    /**
     * @dev Triggered when an attestation has been made.
     *
     * @param recipient The recipient the attestation.
     * @param attester The attesting account.
     * @param uuid The UUID the revoked attestation.
     * @param ao The UIID of the AO.
     */
    event Attested(address indexed recipient, address indexed attester, bytes32 indexed uuid, bytes32 ao);

    /**
     * @dev Triggered when an attestation has been revoked.
     *
     * @param recipient The recipient the attestation.
     * @param attester The attesting account.
     * @param ao The UIID of the AO.
     * @param uuid The UUID the revoked attestation.
     */
    event Revoked(address indexed recipient, address indexed attester, bytes32 indexed uuid, bytes32 ao);

    /**
     * @dev Returns the address of the AO global registry.
     *
     * @return The address of the AO global registry.
     */
    function getAORegistry() external view returns (IAORegistry);

    /**
     * @dev Returns the address of the EIP712 verifier used to verify signed attestations.
     *
     * @return The address of the EIP712 verifier used to verify signed attestations.
     */
    function getEIP712Verifier() external view returns (IEIP712Verifier);

    /**
     * @dev Returns the global counter for the total number of attestations.
     *
     * @return The global counter for the total number of attestations.
     */
    function getAttestationsCount() external view returns (uint256);

    /**
     * @dev Attests to a specific AO.
     *
     * @param recipient The recipient the attestation.
     * @param ao The UIID of the AO.
     * @param expirationTime The expiration time of the attestation.
     * @param refUUID An optional related attestation's UUID.
     * @param data The additional attestation data.
     *
     * @return The UUID of the new attestation.
     */
    function attest(
        address recipient,
        bytes32 ao,
        uint256 expirationTime,
        bytes32 refUUID,
        bytes calldata data
    ) external payable returns (bytes32);

    /**
     * @dev Attests to a specific AO using a provided EIP712 signature.
     *
     * @param recipient The recipient the attestation.
     * @param ao The UIID of the AO.
     * @param expirationTime The expiration time of the attestation.
     * @param refUUID An optional related attestation's UUID.
     * @param data The additional attestation data.
     * @param attester The attesting account.
     * @param v The recovery ID.
     * @param r The x-coordinate of the nonce R.
     * @param s The signature data.
     *
     * @return The UUID of the new attestation.
     */
    function attestByDelegation(
        address recipient,
        bytes32 ao,
        uint256 expirationTime,
        bytes32 refUUID,
        bytes calldata data,
        address attester,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable returns (bytes32);

    /**
     * @dev Revokes an existing attestation to a specific AO.
     *
     * @param uuid The UUID of the attestation to revoke.
     */
    function revoke(bytes32 uuid) external;

    /**
     * @dev Attests to a specific AO using a provided EIP712 signature.
     *
     * @param uuid The UUID of the attestation to revoke.
     * @param attester The attesting account.
     * @param v The recovery ID.
     * @param r The x-coordinate of the nonce R.
     * @param s The signature data.
     */
    function revokeByDelegation(
        bytes32 uuid,
        address attester,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

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

    /**
     * @dev Returns all received attestation UUIDs.
     *
     * @param recipient The recipient the attestation.
     * @param ao The UUID of the AO.
     * @param start The offset to start from.
     * @param length The number of total members to retrieve.
     * @param reverseOrder Whether the offset starts from the end and the data is returned in reverse.
     *
     * @return An array of attestation UUIDs.
     */
    function getReceivedAttestationUUIDs(
        address recipient,
        bytes32 ao,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) external view returns (bytes32[] memory);

    /**
     * @dev Returns the number of received attestation UUIDs.
     *
     * @param recipient The recipient the attestation.
     * @param ao The UIID of the AO.
     *
     * @return The number of attestations.
     */
    function getReceivedAttestationUUIDsCount(address recipient, bytes32 ao) external view returns (uint256);

    /**
     * @dev Returns all sent attestation UUIDs.
     *
     * @param attester The attesting account.
     * @param ao The UIID of the AO.
     * @param start The offset to start from.
     * @param length The number of total members to retrieve.
     * @param reverseOrder Whether the offset starts from the end and the data is returned in reverse.
     *
     * @return An array of attestation UUIDs.
     */
    function getSentAttestationUUIDs(
        address attester,
        bytes32 ao,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) external view returns (bytes32[] memory);

    /**
     * @dev Returns the number of sent attestation UUIDs.
     *
     * @param recipient The recipient the attestation.
     * @param ao The UIID of the AO.
     *
     * @return The number of attestations.
     */
    function getSentAttestationUUIDsCount(address recipient, bytes32 ao) external view returns (uint256);

    /**
     * @dev Returns all attestations related to a specific attestation.
     *
     * @param uuid The UUID of the attestation to retrieve.
     * @param start The offset to start from.
     * @param length The number of total members to retrieve.
     * @param reverseOrder Whether the offset starts from the end and the data is returned in reverse.
     *
     * @return An array of attestation UUIDs.
     */
    function getRelatedAttestationUUIDs(
        bytes32 uuid,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) external view returns (bytes32[] memory);

    /**
     * @dev Returns the number of related attestation UUIDs.
     *
     * @param uuid The UUID of the attestation to retrieve.
     *
     * @return The number of related attestations.
     */
    function getRelatedAttestationUUIDsCount(bytes32 uuid) external view returns (uint256);
}
