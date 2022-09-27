// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../../ASResolver.sol";

/**
 * @title A sample AS resolver that checks whether an attestation data is either \x00 or \x01.
 */
contract TestASDataResolver is ASResolver {
    function resolve(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata data,
        uint32, /* expirationTime */
        address /* msgSender */
    ) external payable virtual override returns (bool) {
        // Verifies that the data is either 0 or 1.
        return data.length == 1 && (data[0] == "\x00" || data[0] == "\x01");
    }
}
