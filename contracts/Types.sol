// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

// A representation of an empty/uninitialized UID.
bytes32 constant EMPTY_UID = 0;

/**
 * @dev A struct representing EIP712 signature data.
 */
struct EIP712Signature {
    uint8 v; // The recovery ID.
    bytes32 r; // The x-coordinate of the nonce R.
    bytes32 s; // The signature data.
}
