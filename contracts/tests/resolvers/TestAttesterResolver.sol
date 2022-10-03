// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { SchemaResolver } from "../../SchemaResolver.sol";

/**
 * @title A sample schema resolver that checks whether the attestation is from a specific attester.
 */
contract TestAttesterResolver is SchemaResolver {
    address private immutable _targetAttester;

    constructor(address targetAttester) {
        _targetAttester = targetAttester;
    }

    function resolve(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint32, /* expirationTime */
        address msgSender
    ) external payable virtual override returns (bool) {
        return msgSender == _targetAttester;
    }
}
