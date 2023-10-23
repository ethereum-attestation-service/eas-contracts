// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import { IEAS, AttestationRequest, AttestationRequestData, Attestation } from "./IEAS.sol";
import { EMPTY_UID, uncheckedInc } from "./Common.sol";
import { Semver } from "./Semver.sol";

/// @title EASIndexer
/// @notice Indexing Service for the Ethereum Attestation Service
contract EASIndexer is Semver {
    error InvalidEAS();
    error InvalidAttestation();
    error AlreadyIndexed();
    error InvalidOffset();

    event AttestationIndexed(bytes32 indexed uid);

    /// A mapping between an account and its received attestations.
    mapping(address account => mapping(bytes32 => bytes32[] uids) receivedAttestations) private _receivedAttestations;

    // A mapping between an account and its sent attestations.
    mapping(address account => mapping(bytes32 => bytes32[] uids) sentAttestations) private _sentAttestations;

    // A mapping between a schema, attester, and recipient.
    mapping(bytes32 schemaUID => mapping(address attester => mapping(address recipient => bytes32[] uids)))
        private _schemaAttesterRecipientAttestations;

    // A mapping between a schema and its attestations.
    mapping(bytes32 schemaUID => bytes32[] uids) private _schemaAttestations;

    // The global mapping of attestation indexing status.
    mapping(bytes32 attestationUID => bool status) private _indexedAttestations;

    // The address of the global EAS contract.
    IEAS private immutable _eas;

    /// @notice Creates a new EASIndexer instance.
    /// @param eas The address of the global EAS contract.
    constructor(IEAS eas) Semver(1, 2, 0) {
        if (address(eas) == address(0)) {
            revert InvalidEAS();
        }

        _eas = eas;
    }

    /// @notice Returns the EAS.
    function getEAS() external view returns (IEAS) {
        return _eas;
    }

    function indexAttestation(bytes32 attestationUID) external {
        _indexAttestation(attestationUID);
    }

    function indexAttestations(bytes32[] calldata attestationUIDs) external {
        uint256 length = attestationUIDs.length;
        for (uint256 i = 0; i < length; i = uncheckedInc(i)) {
            _indexAttestation(attestationUIDs[i]);
        }
    }

    function isAttestationIndexed(bytes32 attestationUID) external view returns (bool) {
        if (_indexedAttestations[attestationUID]) {
            return true;
        }

        return false;
    }

    function getReceivedAttestationUIDs(
        address recipient,
        bytes32 schema,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) external view returns (bytes32[] memory) {
        return _sliceUIDs(_receivedAttestations[recipient][schema], start, length, reverseOrder);
    }

    function getReceivedAttestationUIDCount(address recipient, bytes32 schema) external view returns (uint256) {
        return _receivedAttestations[recipient][schema].length;
    }

    function getSentAttestationUIDs(
        address attester,
        bytes32 schema,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) external view returns (bytes32[] memory) {
        return _sliceUIDs(_sentAttestations[attester][schema], start, length, reverseOrder);
    }

    function getSchemaAttesterRecipientAttestationUIDs(
        bytes32 schema,
        address attester,
        address recipient,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) external view returns (bytes32[] memory) {
        return
            _sliceUIDs(_schemaAttesterRecipientAttestations[schema][attester][recipient], start, length, reverseOrder);
    }

    function getSchemaAttesterRecipientAttestationUIDCount(
        bytes32 schema,
        address attester,
        address recipient
    ) external view returns (uint256) {
        return _schemaAttesterRecipientAttestations[schema][attester][recipient].length;
    }

    function getSentAttestationUIDCount(address recipient, bytes32 schema) external view returns (uint256) {
        return _sentAttestations[recipient][schema].length;
    }

    function getSchemaAttestationUIDs(
        bytes32 schema,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) external view returns (bytes32[] memory) {
        return _sliceUIDs(_schemaAttestations[schema], start, length, reverseOrder);
    }

    function getSchemaAttestationUIDCount(bytes32 schema) external view returns (uint256) {
        return _schemaAttestations[schema].length;
    }

    function _indexAttestation(bytes32 attestationUID) private {
        // Check if attestation is already indexed.
        if (_indexedAttestations[attestationUID]) {
            revert AlreadyIndexed();
        }

        // Check if the attestation exists.
        Attestation memory attestation = _eas.getAttestation(attestationUID);

        if (attestation.uid == EMPTY_UID) {
            revert InvalidAttestation();
        }

        // Index the attestation.
        _indexedAttestations[attestationUID] = true;
        _schemaAttestations[attestation.schema].push(attestationUID);
        _receivedAttestations[attestation.recipient][attestation.schema].push(attestationUID);
        _sentAttestations[attestation.attester][attestation.schema].push(attestationUID);
        _schemaAttesterRecipientAttestations[attestation.schema][attestation.attester][attestation.recipient].push(
            attestationUID
        );

        emit AttestationIndexed(attestation.uid);
    }

    /**
     * @dev Returns a slice in an array of attestation UIDs.
     *
     * @param uids The array of attestation UIDs.
     * @param start The offset to start from.
     * @param length The number of total members to retrieve.
     * @param reverseOrder Whether the offset starts from the end and the data is returned in reverse.
     *
     * @return An array of attestation UIDs.
     */
    function _sliceUIDs(
        bytes32[] memory uids,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) private pure returns (bytes32[] memory) {
        uint256 attestationsLength = uids.length;
        if (attestationsLength == 0) {
            return new bytes32[](0);
        }

        if (start >= attestationsLength) {
            revert InvalidOffset();
        }

        unchecked {
            uint256 len = length;
            if (attestationsLength < start + length) {
                len = attestationsLength - start;
            }

            bytes32[] memory res = new bytes32[](len);

            for (uint256 i = 0; i < len; ++i) {
                res[i] = uids[reverseOrder ? attestationsLength - (start + i + 1) : start + i];
            }

            return res;
        }
    }
}
