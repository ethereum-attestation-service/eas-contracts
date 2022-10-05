// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { SchemaResolver } from "../../SchemaResolver.sol";
import { IEAS } from "../../IEAS.sol";

/**
 * @title A sample schema resolver that checks whether the attestation is to a specific recipient.
 */
contract TestRecipientResolver is SchemaResolver {
    address private immutable _targetRecipient;

    constructor(IEAS eas, address targetRecipient) SchemaResolver(eas) {
        _targetRecipient = targetRecipient;
    }

    function onAttest(
        address recipient,
        bytes calldata, /* schema */
        bytes calldata, /* data */
        uint32, /* expirationTime */
        address /* attester */
    ) internal virtual override returns (bool) {
        return recipient == _targetRecipient;
    }
}
