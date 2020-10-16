// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../../IAOVerifier.sol";

/// @title A sample AO verifier that checks whether the attestation is to a specific recipient.
contract TestAORecipientVerifier is IAOVerifier {
    address public _targetRecipient;

    constructor(address targetRecipient) public {
        _targetRecipient = targetRecipient;
    }

    function verify(
        address recipient,
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint256, /* expirationTime */
        address, /* msgSender */
        uint256 /* msgValue */
    ) public virtual override view returns (bool) {
        return recipient == _targetRecipient;
    }
}
