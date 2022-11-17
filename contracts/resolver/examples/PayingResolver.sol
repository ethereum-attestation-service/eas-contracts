// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import { SchemaResolver } from "../SchemaResolver.sol";

import { IEAS, Attestation } from "../../IEAS.sol";

/**
 * @title A sample schema resolver that pays attesters (and expects the payment to be returned during revocations)
 */
contract PayingResolver is SchemaResolver {
    using Address for address payable;

    uint256 private immutable _incentive;

    constructor(IEAS eas, uint256 incentive) SchemaResolver(eas) {
        _incentive = incentive;
    }

    function isPayable() public pure override returns (bool) {
        return true;
    }

    function onAttest(Attestation calldata attestation) internal virtual override returns (bool) {
        payable(attestation.attester).transfer(_incentive);

        return true;
    }

    function onRevoke(Attestation calldata attestation) internal virtual override returns (bool) {
        if (msg.value < _incentive) {
            return false;
        }

        if (msg.value > _incentive) {
            payable(address(attestation.attester)).sendValue(msg.value - _incentive);
        }

        return true;
    }
}
