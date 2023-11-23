// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { SchemaResolver } from "../SchemaResolver.sol";

import { IEAS, Attestation } from "../../IEAS.sol";

/// @title TokenResolver
/// @notice A sample schema resolver that checks whether a specific amount of tokens was approved to be included in an attestation.
contract TokenResolver is SchemaResolver {
    using SafeERC20 for IERC20;

    error InvalidAllowance();

    IERC20 private immutable _targetToken;
    uint256 private immutable _targetAmount;

    constructor(IEAS eas, IERC20 targetToken, uint256 targetAmount) SchemaResolver(eas) {
        _targetToken = targetToken;
        _targetAmount = targetAmount;
    }

    function onAttest(Attestation calldata attestation, uint256 /*value*/) internal view override returns (bool) {
        if (_targetToken.allowance(attestation.attester, address(this)) < _targetAmount) {
            revert InvalidAllowance();
        }

        return true;
    }

    function onRevoke(Attestation calldata /*attestation*/, uint256 /*value*/) internal pure override returns (bool) {
        return true;
    }
}
