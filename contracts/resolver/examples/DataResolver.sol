// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import { SchemaResolver } from "../SchemaResolver.sol";

import { IEAS, Attestation } from "../../IEAS.sol";

/// @title DataResolver
/// @notice A sample schema resolver that checks whether an attestation data is either \x00 or \x01.
contract DataResolver is SchemaResolver {
    bytes1 private constant DATA1 = "\x00";
    bytes1 private constant DATA2 = "\x01";

    constructor(IEAS eas) SchemaResolver(eas) {}

    function onAttest(Attestation calldata attestation, uint256 /*value*/) internal pure override returns (bool) {
        // Verifies that the data is either 0 or 1.
        return attestation.data.length == 1 && (attestation.data[0] == DATA1 || attestation.data[0] == DATA2);
    }

    function onRevoke(Attestation calldata /*attestation*/, uint256 /*value*/) internal pure override returns (bool) {
        return true;
    }
}
