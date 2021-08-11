// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "../../IASResolver.sol";

/**
 * @title A sample AS resolver that checks whether the attestation is from a specific attester.
 */
contract TestASAttesterResolver is IASResolver {
    address private immutable _targetAttester;

    constructor(address targetAttester) {
        _targetAttester = targetAttester;
    }

    function isPayable() external pure override returns (bool) {
        return false;
    }

    function resolve(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint256, /* expirationTime */
        address msgSender
    ) external payable virtual override returns (bool) {
        return msgSender == _targetAttester;
    }
}
