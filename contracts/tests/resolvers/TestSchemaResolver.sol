// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { SchemaResolver } from "../../SchemaResolver.sol";
import { IEAS } from "../../IEAS.sol";

/**
 * @title A sample schema resolver
 */
contract TestSchemaResolver is SchemaResolver {
    constructor(IEAS eas) SchemaResolver(eas) {}

    function onAttest(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata, /* data*/
        uint32, /* expirationTime */
        address /* attester */
    ) internal virtual override returns (bool) {
        return true;
    }
}
