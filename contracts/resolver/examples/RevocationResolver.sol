// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { SchemaResolver } from "../SchemaResolver.sol";

import { IEAS, Attestation } from "../../IEAS.sol";

/**
 * @title A sample schema resolver that controls revocations.
 */
contract RevocationResolver is SchemaResolver {
    bool private _revocation;

    constructor(IEAS eas) SchemaResolver(eas) {}

    function setRevocation(bool status) external {
        _revocation = status;
    }

    function onAttest(
        Attestation calldata /*attestation)*/,
        uint256 /*value*/
    ) internal virtual override returns (bool) {
        return true;
    }

    function onRevoke(
        Attestation calldata /*attestation*/,
        uint256 /*value*/
    ) internal virtual override returns (bool) {
        return _revocation;
    }
}
