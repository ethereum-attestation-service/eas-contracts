// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "../../IASVerifier.sol";

/**
 * @title A sample AS verifier that checks whether the expiration time is later than a specific timestamp.
 */
contract TestASExpirationTimeVerifier is IASVerifier {
    uint256 private immutable _validAfter;

    constructor(uint256 validAfter) {
        _validAfter = validAfter;
    }

    function verify(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint256 expirationTime,
        address, /* msgSender */
        uint256 /* msgValue */
    ) external view virtual override returns (bool) {
        return expirationTime >= _validAfter;
    }
}
