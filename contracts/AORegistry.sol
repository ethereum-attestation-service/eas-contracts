// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./ISchemaVerifier.sol";

/// @title The global AO registry.
contract AORegistry {
    string public constant VERSION = "0.1";

    // A data struct representing a record for a submitted AO (Attestation Object).
    struct AORecord {
        uint256 id;
        bytes schema;
        ISchemaVerifier verifier;
    }

    // A global mapping between AO records and their IDs.
    mapping(uint256 => AORecord) private registry;

    // A global counter for the total number of attestations.
    uint256 public aoCount;

    /// @dev Triggered when a new AO has been registered.
    ///
    /// @param _id The AO id.
    /// @param _schema The AO schema.
    /// @param _verifier An optional AO schema verifier.
    /// @param _from The address of the account used to register the AO.
    event Registered(uint256 indexed _id, bytes _schema, ISchemaVerifier indexed _verifier, address indexed _from);

    /// @dev Submits and reserve a new AO.
    ///
    /// @param _schema The AO data schema.
    /// @param _verifier An optional AO schema verifier.
    function register(bytes calldata _schema, ISchemaVerifier _verifier) public {
        uint256 id = ++aoCount;

        registry[id] = AORecord({id: id, schema: _schema, verifier: _verifier});

        emit Registered(id, _schema, _verifier, msg.sender);
    }

    /// @dev Returns an existing AO by ID.
    ///
    /// @param _id The ID of the AO to retrieve.
    ///
    /// @return The AO data members.
    function getAO(uint256 _id)
        public
        view
        returns (
            uint256,
            bytes memory,
            ISchemaVerifier
        )
    {
        AORecord memory ao = registry[_id];

        return (ao.id, ao.schema, ao.verifier);
    }
}
