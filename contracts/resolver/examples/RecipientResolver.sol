// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { SchemaResolver } from "../SchemaResolver.sol";

import { IEAS, Attestation } from "../../IEAS.sol";

/**
 * @title A sample schema resolver that checks whether the attestation is to a specific recipient.
 */
contract RecipientResolver is SchemaResolver {
    address private immutable _targetRecipient;

    constructor(IEAS eas, address targetRecipient) SchemaResolver(eas) {
        _targetRecipient = targetRecipient;
    }

    function onAttest(Attestation calldata attestation) internal virtual override returns (bool) {
        return attestation.recipient == _targetRecipient;
    }

    function onRevoke(
        Attestation calldata /*attestation*/
    ) internal virtual override returns (bool) {
        return true;
    }
}
