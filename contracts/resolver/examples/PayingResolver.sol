// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { SchemaResolver } from "../SchemaResolver.sol";

import { IEAS, Attestation } from "../../IEAS.sol";

/**
 * @title A sample schema resolver that pays attesters
 */
contract PayingResolver is SchemaResolver {
    uint256 private immutable _incentive;

    constructor(IEAS eas, uint256 incentive) SchemaResolver(eas) {
        _incentive = incentive;
    }

    function isPayable() public pure override returns (bool) {
        return true;
    }

    function onAttest(Attestation calldata attestation) internal virtual override returns (bool) {
        payable(attestation.recipient).transfer(_incentive);

        return true;
    }

    function onRevoke(
        Attestation calldata /*attestation*/
    ) internal virtual override returns (bool) {
        return true;
    }
}
