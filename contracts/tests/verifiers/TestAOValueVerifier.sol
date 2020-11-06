// SPDX-License-Identifier: MIT

pragma solidity 0.7.4;

import "../../IAOVerifier.sol";

/// @title A sample AO verifier that checks whether a specific amount of ETH was sent with an attestation.
contract TestAOValueVerifier is IAOVerifier {
    uint256 public _targetValue;

    constructor(uint256 targetValue) {
        _targetValue = targetValue;
    }

    function verify(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint256, /* expirationTime */
        address, /* msgSender */
        uint256 msgValue
    ) public view virtual override returns (bool) {
        return msgValue == _targetValue;
    }
}
