// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "../../IASVerifier.sol";

/**
 * @title A sample AS verifier that checks whether a specific amount of ETH was sent with an attestation.
 */
contract TestASValueVerifier is IASVerifier {
    uint256 private immutable _targetValue;

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
    ) external view virtual override returns (bool) {
        return msgValue == _targetValue;
    }
}
