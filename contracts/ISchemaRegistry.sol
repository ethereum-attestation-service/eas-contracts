// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { ISchemaResolver } from "./resolver/ISchemaResolver.sol";

/**
 * @title A struct representing a record for a submitted schema.
 */
struct SchemaRecord {
    // A unique identifier of the schema.
    bytes32 uuid;
    // Optional schema resolver.
    ISchemaResolver resolver;
    // Custom specification of the schema (e.g., an ABI).
    string schema;
}

/**
 * @title The global schema registry interface.
 */
interface ISchemaRegistry {
    /**
     * @dev Triggered when a new schema has been registered
     *
     * @param uuid The schema UUID.
     * @param registerer The address of the account used to register the schema.
     */
    event Registered(bytes32 indexed uuid, address registerer);

    /**
     * @dev Submits and reserves a new schema
     *
     * @param schema The schema data schema.
     * @param resolver An optional schema resolver.
     *
     * @return The UUID of the new schema.
     */
    function register(string calldata schema, ISchemaResolver resolver) external returns (bytes32);

    /**
     * @dev Returns an existing schema by UUID
     *
     * @param uuid The UUID of the schema to retrieve.
     *
     * @return The schema data members.
     */
    function getSchema(bytes32 uuid) external view returns (SchemaRecord memory);
}
