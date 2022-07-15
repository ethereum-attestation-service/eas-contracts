// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

import "../../ASResolver.sol";

/**
 * @title A sample AS resolver that pays attesters
 */
contract TestASPayingResolver is ASResolver {
    uint256 private immutable _incentive;

    constructor(uint256 incentive) {
        _incentive = incentive;
    }

    function isPayable() public pure override returns (bool) {
        return true;
    }

    function resolve(
        address recipient,
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint32, /* expirationTime */
        address /* msgSender */
    ) external payable virtual override returns (bool) {
        payable(recipient).transfer(_incentive);

        return true;
    }
}
