// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "./IAORegistry.sol";
import "./IAOVerifier.sol";

/// @title The global AO registry.
contract AORegistry is IAORegistry {
    string public constant VERSION = "0.2";

    // The global mapping between AO records and their IDs.
    mapping(uint256 => AORecord) private _registry;

    // The global counter for the total number of attestations.
    uint256 private _aoCount;

    /// @dev Submits and reserve a new AO.
    ///
    /// @param schema The AO data schema.
    /// @param verifier An optional AO schema verifier.
    function register(bytes calldata schema, IAOVerifier verifier) external override {
        uint256 id = ++_aoCount;

        _registry[id] = AORecord({id: id, schema: schema, verifier: verifier});

        emit Registered(id, schema, verifier, msg.sender);
    }

    /// @dev Returns an existing AO by ID.
    ///
    /// @param id The ID of the AO to retrieve.
    ///
    /// @return The AO data members.
    function getAO(uint256 id)
        external
        view
        override
        returns (
            uint256,
            bytes memory,
            IAOVerifier
        )
    {
        AORecord memory ao = _registry[id];

        return (ao.id, ao.schema, ao.verifier);
    }

    /// @dev Returns the global counter for the total number of attestations.
    ///
    /// @return The global counter for the total number of attestations.
    function getAOCount() external view override returns (uint256) {
        return _aoCount;
    }
}
