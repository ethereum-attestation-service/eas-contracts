// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../../IAOVerifier.sol";

/// @title A sample AO verifier that checks whether a specific amount of ETH was sent with an attestation.
contract TestAOValueVerifier is IAOVerifier {
    uint256 public _targetValue;

    constructor(uint256 targetValue) public {
        _targetValue = targetValue;
    }

    function verify(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint256, /* expirationTime */
        address, /* msgSender */
        uint256 msgValue
    ) public virtual override view returns (bool) {
        return msgValue == _targetValue;
    }
}
