// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

import "../../ASResolver.sol";

/**
 * @title A sample AS resolver that checks whether a specific amount of ETH was sent with an attestation.
 */
contract TestASValueResolver is ASResolver {
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
        uint256, /* expirationTime */
        address /* msgSender */
    ) external payable virtual override returns (bool) {
        return msg.value == _targetValue;
    }
}
