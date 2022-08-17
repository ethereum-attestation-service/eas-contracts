// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../ASResolver.sol";

/**
 * @title A sample AS resolver that checks whether a specific amount of tokens was approved to be included in an attestation.
 */
contract TestASTokenResolver is ASResolver {
    using SafeERC20 for IERC20;

    IERC20 private immutable _targetToken;
    uint256 private immutable _targetAmount;

    constructor(IERC20 targetToken, uint256 targetAmount) {
        _targetToken = targetToken;
        _targetAmount = targetAmount;
    }

    function resolve(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint32, /* expirationTime */
        address msgSender
    ) external payable virtual override returns (bool) {
        _targetToken.safeTransferFrom(msgSender, address(this), _targetAmount);

        return true;
    }
}
