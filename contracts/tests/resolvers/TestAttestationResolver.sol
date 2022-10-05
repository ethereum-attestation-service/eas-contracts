// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { SchemaResolver } from "../../SchemaResolver.sol";

import { EAS } from "../../EAS.sol";

/**
 * @title A sample schema resolver that checks whether an attestations attest to an existing attestation.
 */
contract TestAttestationResolver is SchemaResolver {
    error Overflow();
    error OutOfBounds();

    EAS private immutable _eas;

    constructor(EAS eas) {
        _eas = eas;
    }

    function resolve(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata data,
        uint32, /* expirationTime */
        address /* msgSender */
    ) external payable virtual override returns (bool) {
        return _eas.isAttestationValid(_toBytes32(data, 0));
    }

    function _toBytes32(bytes memory data, uint256 start) private pure returns (bytes32) {
        unchecked {
            if (start + 32 < start) {
                revert Overflow();
            }

            if (data.length < start + 32) {
                revert OutOfBounds();
            }
        }

        bytes32 tempBytes32;

        // solhint-disable-next-line no-inline-assembly
        assembly {
            tempBytes32 := mload(add(add(data, 0x20), start))
        }

        return tempBytes32;
    }
}
