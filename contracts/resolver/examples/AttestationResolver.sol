// SPDX-License-Identifier: MIT

pragma solidity 0.8.27;

import { SchemaResolver } from "../SchemaResolver.sol";

import { IEAS, Attestation } from "../../IEAS.sol";

/// @title AttestationResolver
/// @notice A sample schema resolver that checks whether an attestations attest to an existing attestation with a
//  specific data field.
contract AttestationResolver is SchemaResolver {
    error OutOfBounds();

    bytes32 private constant MAGIC_DATA = "EA5EA5EA5EA5EA5EA5EA5EA5EA5EA5";

    constructor(IEAS eas) SchemaResolver(eas) {}

    function onAttest(Attestation calldata attestation, uint256 /*value*/) internal view override returns (bool) {
        bytes32 uid = _toBytes32(attestation.data, 0);
        Attestation memory targetAttestation = _eas.getAttestation(uid);

        // Make sure that the encoded data is an attestation with the magic data.
        return targetAttestation.data.length == MAGIC_DATA.length && bytes32(targetAttestation.data) == MAGIC_DATA;
    }

    function onRevoke(Attestation calldata /*attestation*/, uint256 /*value*/) internal pure override returns (bool) {
        return true;
    }

    function toBytes32(bytes memory data, uint256 start) external pure returns (bytes32) {
        return _toBytes32(data, start);
    }

    function _toBytes32(bytes memory data, uint256 start) private pure returns (bytes32) {
        unchecked {
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
