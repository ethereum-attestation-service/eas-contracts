// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "../../IASVerifier.sol";

/**
 * @title A sample AS verifier that checks whether the attestation is to a specific recipient.
 */
contract TestASRecipientVerifier is IASVerifier {
    address private immutable _targetRecipient;

    constructor(address targetRecipient) {
        _targetRecipient = targetRecipient;
    }

    function verify(
        address recipient,
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint256, /* expirationTime */
        address, /* msgSender */
        uint256 /* msgValue */
    ) external view virtual override returns (bool) {
        return recipient == _targetRecipient;
    }
}
