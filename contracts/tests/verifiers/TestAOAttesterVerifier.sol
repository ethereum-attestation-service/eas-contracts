// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "../../IAOVerifier.sol";

/**
 * @title A sample AO verifier that checks whether the attestation is from a specific attester.
 */
contract TestAOAttesterVerifier is IAOVerifier {
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
