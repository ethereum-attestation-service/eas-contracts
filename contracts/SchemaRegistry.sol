// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { EMPTY_UUID } from "./Types.sol";
import { ISchemaRegistry, SchemaRecord } from "./ISchemaRegistry.sol";
import { ISchemaResolver } from "./ISchemaResolver.sol";

/**
 * @title The global schema registry.
 */
contract SchemaRegistry is ISchemaRegistry {
    error AlreadyExists();

    // The version of the contract.
    string public constant VERSION = "0.13";

    // The global mapping between schema records and their IDs.
    mapping(bytes32 => SchemaRecord) private _registry;

    // The global counter for the total number of attestations.
    uint256 private _schemaCount;

    /**
     * @inheritdoc ISchemaRegistry
     */
    function register(bytes calldata schema, ISchemaResolver resolver) external returns (bytes32) {
        uint256 index;
        unchecked {
            index = ++_schemaCount;
        }

        SchemaRecord memory schemaRecord = SchemaRecord({
            uuid: EMPTY_UUID,
            index: index,
            schema: schema,
            resolver: resolver
        });

        bytes32 uuid = _getUUID(schemaRecord);
        if (_registry[uuid].uuid != EMPTY_UUID) {
            revert AlreadyExists();
        }

        schemaRecord.uuid = uuid;
        _registry[uuid] = schemaRecord;

        emit Registered(uuid, msg.sender);

        return uuid;
    }

    /**
     * @inheritdoc ISchemaRegistry
     */
    function getSchema(bytes32 uuid) external view returns (SchemaRecord memory) {
        return _registry[uuid];
    }

    /**
     * @inheritdoc ISchemaRegistry
     */
    function getSchemaCount() external view returns (uint256) {
        return _schemaCount;
    }

    /**
     * @dev Calculates a UUID for a given AS.
     *
     * @param schemaRecord The input AS.
     *
     * @return schema UUID.
     */
    function _getUUID(SchemaRecord memory schemaRecord) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(schemaRecord.schema, schemaRecord.resolver));
    }
}
