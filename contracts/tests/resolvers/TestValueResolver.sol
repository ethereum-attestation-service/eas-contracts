// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { SchemaResolver } from "../../SchemaResolver.sol";

/**
 * @title A sample schema resolver that checks whether a specific amount of ETH was sent with an attestation.
 */
contract TestValueResolver is SchemaResolver {
    uint256 private immutable _targetValue;

    constructor(uint256 targetValue) {
        _targetValue = targetValue;
    }

    function isPayable() public pure override returns (bool) {
        return true;
    }

    function resolve(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint32, /* expirationTime */
        address /* msgSender */
    ) external payable virtual override returns (bool) {
        return msg.value == _targetValue;
    }
}
