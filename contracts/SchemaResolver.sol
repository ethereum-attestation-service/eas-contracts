// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { IEAS } from "./IEAS.sol";
import { ISchemaResolver } from "./ISchemaResolver.sol";

/**
 * @title A base resolver contract
 */
abstract contract SchemaResolver is ISchemaResolver {
    error AccessDenied();
    error InvalidEAS();
    error NotPayable();

    // The version of the contract.
    string public constant VERSION = "0.10";

    // The global EAS contract.
    IEAS internal immutable _eas;

    /**
     * @dev Creates a new resolver.
     *
     * @param eas The address of the global EAS contract.
     */
    constructor(IEAS eas) {
        if (address(eas) == address(0)) {
            revert InvalidEAS();
        }

        _eas = eas;
    }

    /**
     * @inheritdoc ISchemaResolver
     */
    function isPayable() public pure virtual returns (bool) {
        return false;
    }

    /**
     * @dev ETH callback
     */
    receive() external payable virtual {
        if (!isPayable()) {
            revert NotPayable();
        }
    }

    /**
     * @inheritdoc ISchemaResolver
     */
    function attest(
        address recipient,
        bytes calldata schema,
        bytes calldata data,
        uint32 expirationTime,
        address attester
    ) external payable returns (bool) {
        if (msg.sender != address(_eas)) {
            revert AccessDenied();
        }

        return onAttest(recipient, schema, data, expirationTime, attester);
    }

    /**
     * @dev A resolver callback that should be implemented by child contracts.
     *
     * @param recipient The recipient of the attestation.
     * @param schema The schema data schema.
     * @param data The actual attestation data.
     * @param expirationTime The expiration time of the attestation.
     * @param attester The sender of the original attestation message.
     *
     * @return Whether the data is valid according to the scheme.
     */
    function onAttest(
        address recipient,
        bytes calldata schema,
        bytes calldata data,
        uint32 expirationTime,
        address attester
    ) internal virtual returns (bool);
}
