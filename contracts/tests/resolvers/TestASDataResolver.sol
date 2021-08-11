// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "../../IASResolver.sol";

/**
 * @title A sample AS resolver that checks whether an attestation data is either \x00 or \x01.
 */
contract TestASDataResolver is IASResolver {
    function isPayable() external pure override returns (bool) {
        return false;
    }

    function resolve(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata data,
        uint256, /* expirationTime */
        address /* msgSender */
    ) external payable virtual override returns (bool) {
        // Verifies that the data is either 0 or 1.
        return data.length == 1 && (data[0] == "\x00" || data[0] == "\x01");
    }
}
