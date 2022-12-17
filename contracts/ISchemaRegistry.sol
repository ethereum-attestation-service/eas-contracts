// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { ISchemaResolver } from "./resolver/ISchemaResolver.sol";

/**
 * @title A struct representing a record for a submitted schema.
 */
struct SchemaRecord {
    bytes32 uuid; // The unique identifier of the schema.
    ISchemaResolver resolver; // Optional schema resolver.
    bool revocable; // Whether the schema allows revocations explicitly.
    string schema; // Custom specification of the schema (e.g., an ABI).
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
     * @param revocable Whether the schema allows revocations explicitly.
     *
     * @return The UUID of the new schema.
     */
    function register(string calldata schema, ISchemaResolver resolver, bool revocable) external returns (bytes32);

    /**
     * @dev Returns an existing schema by UUID
     *
     * @param uuid The UUID of the schema to retrieve.
     *
     * @return The schema data members.
     */
    function getSchema(bytes32 uuid) external view returns (SchemaRecord memory);
}
