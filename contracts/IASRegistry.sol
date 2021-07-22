// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;
pragma abicoder v2;

import "./IASVerifier.sol";

/**
 * @title A struct representing a record for a submitted AS (Attestation Object).
 */
struct ASRecord {
    // A unique identifier of the AS.
    bytes32 uuid;
    // Optional schema verifier.
    IASVerifier verifier;
    // Auto-incrementing index for reference, assigned by the registry itself.
    uint256 index;
    // Custom specification of the AS (e.g., an ABI).
    bytes schema;
}

/**
 * @title The global AS registry interface.
 */
interface IASRegistry {
    /**
     * @dev Triggered when a new AS has been registered
     *
     * @param uuid The AS UUID.
     * @param index The AS index.
     * @param schema The AS schema.
     * @param verifier An optional AS schema verifier.
     * @param attester The address of the account used to register the AS.
     */
    event Registered(bytes32 indexed uuid, uint256 indexed index, bytes schema, IASVerifier verifier, address attester);

    /**
     * @dev Submits and reserve a new AS
     *
     * @param schema The AS data schema.
     * @param verifier An optional AS schema verifier.
     *
     * @return The UUID of the new AS.
     */
    function register(bytes calldata schema, IASVerifier verifier) external returns (bytes32);

    /**
     * @dev Returns an existing AS by UUID
     *
     * @param uuid The UUID of the AS to retrieve.
     *
     * @return The AS data members.
     */
    function getAS(bytes32 uuid) external view returns (ASRecord memory);

    /**
     * @dev Returns the global counter for the total number of attestations
     *
     * @return The global counter for the total number of attestations.
     */
    function getASCount() external view returns (uint256);
}
