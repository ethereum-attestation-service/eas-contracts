// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../../IAOVerifier.sol";

/// @title A sample AO verifier that checks whether an attestation data is either \x00 or \x01.
contract TestAODataVerifier is IAOVerifier {
    function verify(
        address, /* _recipient */
        bytes calldata, /* _schema */
        bytes calldata _data,
        uint256, /* _expirationTime */
        address, /* _msgSender */
        uint256 /* _msgValue */
    ) public virtual override view returns (bool) {
        // Verifies that the data is either 0 or 1.
        return _data.length == 1 && (_data[0] == "\x00" || _data[0] == "\x01");
    }
}
