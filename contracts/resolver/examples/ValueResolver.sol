// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import { SchemaResolver } from "../SchemaResolver.sol";

import { IEAS, Attestation } from "../../IEAS.sol";

/// @title ValueResolver
/// @notice A sample schema resolver that checks whether a specific amount of ETH was sent with an attestation.
contract ValueResolver is SchemaResolver {
    uint256 private immutable _targetValue;

    constructor(IEAS eas, uint256 targetValue) SchemaResolver(eas) {
        _targetValue = targetValue;
    }

    function isPayable() public pure override returns (bool) {
        return true;
    }

    function onAttest(Attestation calldata /*attestation*/, uint256 value) internal view override returns (bool) {
        return value == _targetValue;
    }

    function onRevoke(Attestation calldata /*attestation*/, uint256 /*value*/) internal pure override returns (bool) {
        return true;
    }
}
