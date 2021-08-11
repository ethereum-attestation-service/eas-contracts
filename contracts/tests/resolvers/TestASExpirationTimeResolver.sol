// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "../../IASResolver.sol";

/**
 * @title A sample AS resolver that checks whether the expiration time is later than a specific timestamp.
 */
contract TestASExpirationTimeResolver is IASResolver {
    uint256 private immutable _validAfter;

    constructor(uint256 validAfter) {
        _validAfter = validAfter;
    }

    function isPayable() external pure override returns (bool) {
        return false;
    }

    function resolve(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint256 expirationTime,
        address /* msgSender */
    ) external payable virtual override returns (bool) {
        return expirationTime >= _validAfter;
    }
}
