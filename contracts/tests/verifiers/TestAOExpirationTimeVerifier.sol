// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../../IAOVerifier.sol";

/// @title A sample AO verifier that checks whether the expiration time is later than a specific timestamp.
contract TestAOExpirationTimeVerifier is IAOVerifier {
    uint256 public validAfter;

    constructor(uint256 _validAfter) public {
        validAfter = _validAfter;
    }

    function verify(
        address, /* _recipient */
        bytes calldata, /* _schema */
        bytes calldata, /* _data */
        uint256 _expirationTime,
        address, /* _msgSender */
        uint256 /* _msgValue */
    ) public virtual override view returns (bool) {
        return _expirationTime >= validAfter;
    }
}
