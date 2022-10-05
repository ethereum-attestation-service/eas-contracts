// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { SchemaResolver } from "../../SchemaResolver.sol";
import { IEAS } from "../../IEAS.sol";

/**
 * @title A sample schema resolver that checks whether a specific amount of ETH was sent with an attestation.
 */
contract TestValueResolver is SchemaResolver {
    uint256 private immutable _targetValue;

    constructor(IEAS eas, uint256 targetValue) SchemaResolver(eas) {
        _targetValue = targetValue;
    }

    function isPayable() public pure override returns (bool) {
        return true;
    }

    function onAttest(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint32, /* expirationTime */
        address /* attester */
    ) internal virtual override returns (bool) {
        return msg.value == _targetValue;
    }
}
