// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { SchemaResolver } from "../../SchemaResolver.sol";
import { IEAS } from "../../IEAS.sol";

/**
 * @title A sample schema resolver that pays attesters
 */
contract TestPayingResolver is SchemaResolver {
    uint256 private immutable _incentive;

    constructor(IEAS eas, uint256 incentive) SchemaResolver(eas) {
        _incentive = incentive;
    }

    function isPayable() public pure override returns (bool) {
        return true;
    }

    function onAttest(
        address recipient,
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint32, /* expirationTime */
        address /* attester */
    ) internal virtual override returns (bool) {
        payable(recipient).transfer(_incentive);

        return true;
    }
}
