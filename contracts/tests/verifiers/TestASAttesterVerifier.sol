// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "../../IASVerifier.sol";

/**
 * @title A sample AS verifier that checks whether the attestation is from a specific attester.
 */
contract TestASAttesterVerifier is IASVerifier {
    address private immutable _targetAttester;

    constructor(address targetAttester) {
        _targetAttester = targetAttester;
    }

    function verify(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint256, /* expirationTime */
        address msgSender,
        uint256 /* msgValue */
    ) external view virtual override returns (bool) {
        return msgSender == _targetAttester;
    }
}
