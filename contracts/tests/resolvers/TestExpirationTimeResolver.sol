// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { SchemaResolver } from "../../SchemaResolver.sol";
import { IEAS } from "../../IEAS.sol";

/**
 * @title A sample schema resolver that checks whether the expiration time is later than a specific timestamp.
 */
contract TestExpirationTimeResolver is SchemaResolver {
    uint256 private immutable _validAfter;

    constructor(IEAS eas, uint256 validAfter) SchemaResolver(eas) {
        _validAfter = validAfter;
    }

    function onAttest(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint32 expirationTime,
        address /* attester */
    ) internal virtual override returns (bool) {
        return expirationTime >= _validAfter;
    }
}
