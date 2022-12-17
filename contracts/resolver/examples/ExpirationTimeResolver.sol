// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { SchemaResolver } from "../SchemaResolver.sol";

import { IEAS, Attestation } from "../../IEAS.sol";

/**
 * @title A sample schema resolver that checks whether the expiration time is later than a specific timestamp.
 */
contract ExpirationTimeResolver is SchemaResolver {
    uint256 private immutable _validAfter;

    constructor(IEAS eas, uint256 validAfter) SchemaResolver(eas) {
        _validAfter = validAfter;
    }

    function onAttest(Attestation calldata attestation, uint256 /*value*/) internal virtual override returns (bool) {
        return attestation.expirationTime >= _validAfter;
    }

    function onRevoke(
        Attestation calldata /*attestation*/,
        uint256 /*value*/
    ) internal virtual override returns (bool) {
        return true;
    }
}
