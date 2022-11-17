// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { SchemaResolver } from "../resolver/SchemaResolver.sol";

import { IEAS, Attestation } from "../IEAS.sol";

/**
 * @title A sample schema resolver
 */
contract TestSchemaResolver is SchemaResolver {
    constructor(IEAS eas) SchemaResolver(eas) {}

    function onAttest(Attestation calldata /*attestation*/) internal virtual override returns (bool) {
        return true;
    }

    function onRevoke(Attestation calldata /*attestation*/) internal virtual override returns (bool) {
        return true;
    }
}
