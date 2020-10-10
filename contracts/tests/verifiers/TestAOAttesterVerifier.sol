// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../../IAOVerifier.sol";

/// @title A sample AO verifier that checks whether the attestation is from a specific attester.
contract TestAOAttesterVerifier is IAOVerifier {
    address public targetAttester;

    constructor(address _targetAttester) public {
        targetAttester = _targetAttester;
    }

    function verify(
        address, /* _recipient */
        bytes calldata, /* _schema */
        bytes calldata, /* _data */
        uint256, /* _expirationTime */
        address _msgSender,
        uint256 /* _msgValue */
    ) public virtual override view returns (bool) {
        return _msgSender == targetAttester;
    }
}
