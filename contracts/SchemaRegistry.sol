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

    /**
     * @inheritdoc ISchemaRegistry
     */
    function register(string calldata schema, ISchemaResolver resolver) external returns (bytes32) {
        SchemaRecord memory schemaRecord = SchemaRecord({ uuid: EMPTY_UUID, schema: schema, resolver: resolver });

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
