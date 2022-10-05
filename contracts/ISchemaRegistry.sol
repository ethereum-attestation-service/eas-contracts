// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { ISchemaResolver } from "./ISchemaResolver.sol";

/**
 * @title A struct representing a record for a submitted schema.
 */
struct SchemaRecord {
    // A unique identifier of the schema.
    bytes32 uuid;
    // Optional schema resolver.
    ISchemaResolver resolver;
    // Auto-incrementing index for reference, assigned by the registry itself.
    uint256 index;
    // Custom specification of the schema (e.g., an ABI).
    bytes schema;
}

/**
 * @title The global schema registry interface.
 */
interface ISchemaRegistry {
    /**
     * @dev Triggered when a new schema has been registered
     *
     * @param uuid The schema UUID.
     * @param index The schema index.
     * @param schema The schema schema.
     * @param resolver An optional schema resolver.
     * @param attester The address of the account used to register the schema.
     */
    event Registered(
        bytes32 indexed uuid,
        uint256 indexed index,
        bytes schema,
        ISchemaResolver resolver,
        address attester
    );

    /**
     * @dev Submits and reserves a new schema
     *
     * @param schema The schema data schema.
     * @param resolver An optional schema resolver.
     *
     * @return The UUID of the new AS.
     */
    function register(bytes calldata schema, ISchemaResolver resolver) external returns (bytes32);

    /**
     * @dev Returns an existing schema by UUID
     *
     * @param uuid The UUID of the schema to retrieve.
     *
     * @return The schema data members.
     */
    function getSchema(bytes32 uuid) external view returns (SchemaRecord memory);

    /**
     * @dev Returns the global counter for the total number of schemas
     *
     * @return The global counter for the total number of schemas.
     */
    function getSchemaCount() external view returns (uint256);
}
