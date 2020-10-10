// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../../IAOVerifier.sol";

/// @title A sample AO verifier that checks whether a specific amount of ETH was sent with an attestation.
contract TestAOValueVerifier is IAOVerifier {
    uint256 public targetValue;

    constructor(uint256 _targetValue) public {
        targetValue = _targetValue;
    }

    function verify(
        address, /* _recipient */
        bytes calldata, /* _schema */
        bytes calldata, /* _data */
        uint256, /* _expirationTime */
        address, /* _msgSender */
        uint256 _msgValue
    ) public virtual override view returns (bool) {
        return _msgValue == targetValue;
    }
}
