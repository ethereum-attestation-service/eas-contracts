// SPDX-License-Identifier: MIT

pragma solidity 0.8.11;

import "../../ASResolver.sol";

/**
 * @title A sample AS resolver that checks whether the attestation is to a specific recipient.
 */
contract TestASRecipientResolver is ASResolver {
    address private immutable _targetRecipient;

    constructor(address targetRecipient) {
        _targetRecipient = targetRecipient;
    }

    function resolve(
        address recipient,
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint256, /* expirationTime */
        address /* msgSender */
    ) external payable virtual override returns (bool) {
        return recipient == _targetRecipient;
    }
}
