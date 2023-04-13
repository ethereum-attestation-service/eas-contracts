// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

// A representation of an empty/uninitialized UID.
bytes32 constant EMPTY_UID = 0;

error InvalidEAS();
error InvalidLength();
error InvalidSignature();

/**
 * @dev A struct representing EIP712 signature data.
 */
struct EIP712Signature {
    uint8 v; // The recovery ID.
    bytes32 r; // The x-coordinate of the nonce R.
    bytes32 s; // The signature data.
}

/**
 * @dev A struct representing a single attestation.
 */
struct Attestation {
    bytes32 uid; // A unique identifier of the attestation.
    bytes32 schema; // The unique identifier of the schema.
    uint64 time; // The time when the attestation was created (Unix timestamp).
    uint64 expirationTime; // The time when the attestation expires (Unix timestamp).
    uint64 revocationTime; // The time when the attestation was revoked (Unix timestamp).
    bytes32 refUID; // The UID of the related attestation.
    address recipient; // The recipient of the attestation.
    address attester; // The attester/sender of the attestation.
    bool revocable; // Whether the attestation is revocable.
    bytes data; // Custom attestation data.
}

/**
 * @dev Merges lists of UIDs.
 *
 * @param uidLists The provided lists of UIDs.
 * @param uidsCount Total UIDs count.
 *
 * @return A merged and flatten list of all the UIDs.
 */
function mergeUIDs(bytes32[][] memory uidLists, uint256 uidsCount) pure returns (bytes32[] memory) {
    bytes32[] memory uids = new bytes32[](uidsCount);

    uint256 currentIndex = 0;
    for (uint256 i = 0; i < uidLists.length; ) {
        bytes32[] memory currentUids = uidLists[i];
        for (uint256 j = 0; j < currentUids.length; ) {
            uids[currentIndex] = currentUids[j];

            unchecked {
                ++j;
                ++currentIndex;
            }
        }
        unchecked {
            ++i;
        }
    }

    return uids;
}
