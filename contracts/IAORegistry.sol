// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "./IAOVerifier.sol";

/// @title The global AO registry interface.
interface IAORegistry {
    // A data struct representing a record for a submitted AO (Attestation Object).
    struct AORecord {
        uint256 id;
        bytes schema;
        IAOVerifier verifier;
    }

    /// @dev Triggered when a new AO has been registered.
    ///
    /// @param id The AO id.
    /// @param schema The AO schema.
    /// @param verifier An optional AO schema verifier.
    /// @param from The address of the account used to register the AO.
    event Registered(uint256 indexed id, bytes schema, IAOVerifier indexed verifier, address indexed from);

    /// @dev Submits and reserve a new AO.
    ///
    /// @param schema The AO data schema.
    /// @param verifier An optional AO schema verifier.
    //
    /// @return The ID of the new AO.
    function register(bytes calldata schema, IAOVerifier verifier) external returns (uint256);

    /// @dev Returns an existing AO by ID.
    ///
    /// @param id The ID of the AO to retrieve.
    ///
    /// @return The AO data members.
    function getAO(uint256 id)
        external
        view
        returns (
            uint256,
            bytes memory,
            IAOVerifier
        );

    /// @dev Returns the global counter for the total number of attestations.
    ///
    /// @return The global counter for the total number of attestations.
    function getAOCount() external view returns (uint256);
}
