// SPDX-License-Identifier: MIT

pragma solidity 0.7.5;

import "../../IAOVerifier.sol";

/// @title A sample AO verifier that checks whether the expiration time is later than a specific timestamp.
contract TestAOExpirationTimeVerifier is IAOVerifier {
    uint256 public _validAfter;

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
    ) public view virtual override returns (bool) {
        return expirationTime >= _validAfter;
    }
}
