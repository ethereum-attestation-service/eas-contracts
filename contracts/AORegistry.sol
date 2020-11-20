// SPDX-License-Identifier: MIT

pragma solidity 0.7.5;

import "./IAOVerifier.sol";

/// @title The global AO registry.
contract AORegistry {
    string public constant VERSION = "0.1";

    // A data struct representing a record for a submitted AO (Attestation Object).
    struct AORecord {
        uint256 id;
        bytes schema;
        IAOVerifier verifier;
    }

    // A global mapping between AO records and their IDs.
    mapping(uint256 => AORecord) private _registry;

    // A global counter for the total number of attestations.
    uint256 public aoCount;

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
    function register(bytes calldata schema, IAOVerifier verifier) public {
        uint256 id = ++aoCount;

        _registry[id] = AORecord({id: id, schema: schema, verifier: verifier});

        emit Registered(id, schema, verifier, msg.sender);
    }

    /// @dev Returns an existing AO by ID.
    ///
    /// @param id The ID of the AO to retrieve.
    ///
    /// @return The AO data members.
    function getAO(uint256 id)
        public
        view
        returns (
            uint256,
            bytes memory,
            IAOVerifier
        )
    {
        AORecord memory ao = _registry[id];

        return (ao.id, ao.schema, ao.verifier);
    }
}
