// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

// A representation of an empty/uninitialized UUID.
bytes32 constant EMPTY_UUID = 0;

/**
 * @dev A struct representing EIP712 signature data.
 */
struct EIP712Signature {
    address attester; // The attesting/revoking account.
    uint8 v; // The recovery ID.
    bytes32 r; // The x-coordinate of the nonce R.
    bytes32 s; // The signature data.
}
