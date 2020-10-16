// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./AORegistry.sol";

/// @title EAS - Ethereum Attestation Service
contract EAS {
    string public constant VERSION = "0.2";

    bytes32 private constant EMPTY_UUID = 0;
    string private constant HASH_SEPARATOR = "@";

    // A data struct representing a single attestation.
    struct Attestation {
        bytes32 _uuid;
        uint256 _ao;
        address _to;
        address _from;
        uint256 _time;
        uint256 _expirationTime;
        uint256 _revocationTime;
        bytes32 _refUUID;
        bytes _data;
    }

    // The AO global registry.
    AORegistry public aoRegistry;

    // A mapping between attestations and their corresponding attestations.
    mapping(bytes32 => bytes32[]) private _relatedAttestations;

    // A mapping between an account and its received attestations.
    mapping(address => mapping(uint256 => bytes32[])) private _receivedAttestations;

    // A mapping between an account and its sent attestations.
    mapping(address => mapping(uint256 => bytes32[])) private _sentAttestations;

    // A global mapping between attestations and their UUIDs.
    mapping(bytes32 => Attestation) private _db;

    // A global counter for the total number of attestations.
    uint256 public attestationsCount;

    /// @dev Triggered when an attestation has been made.
    ///
    /// @param recipient The recipient the attestation.
    /// @param attester The attesting account.
    /// @param uuid The UUID the revoked attestation.
    /// @param ao The ID of the AO.
    event Attested(address indexed recipient, address indexed attester, bytes32 indexed uuid, uint256 ao);

    /// @dev Triggered when an attestation has been revoked.
    ///
    /// @param recipient The recipient the attestation.
    /// @param attester The attesting account.
    /// @param ao The ID of the AO.
    /// @param uuid The UUID the revoked attestation.
    event Revoked(address indexed recipient, address indexed attester, bytes32 indexed uuid, uint256 ao);

    /// @dev Creates a new EAS instance.
    ///
    /// @param registry The address of the global AO registry.
    constructor(AORegistry registry) public {
        require(address(registry) != address(0x0), "ERR_INVALID_ADDRESS");

        aoRegistry = registry;
    }

    /// @dev Attests to a specific AO.
    ///
    /// @param recipient The recipient the attestation.
    /// @param ao The ID of the AO.
    /// @param expirationTime The expiration time of the attestation.
    /// @param data The additional attestation data.
    ///
    /// @return The UUID of the new attestation.
    function attest(
        address recipient,
        uint256 ao,
        uint256 expirationTime,
        bytes32 refUUID,
        bytes calldata data
    ) public payable returns (bytes32) {
        require(expirationTime > block.timestamp, "ERR_INVALID_EXPIRATION_TIME");

        uint256 id;
        bytes memory schema;
        IAOVerifier verifier;
        (id, schema, verifier) = aoRegistry.getAO(ao);

        require(id > 0, "ERR_INVALID_AO");
        require(
            address(verifier) == address(0x0) ||
                verifier.verify(recipient, schema, data, expirationTime, msg.sender, msg.value),
            "ERR_INVALID_ATTESTATION_DATA"
        );

        Attestation memory attestation = Attestation({
            _uuid: EMPTY_UUID,
            _ao: ao,
            _to: recipient,
            _from: msg.sender,
            _time: block.timestamp,
            _expirationTime: expirationTime,
            _revocationTime: 0,
            _refUUID: refUUID,
            _data: data
        });

        bytes32 uuid = _getUUID(attestation);
        attestation._uuid = uuid;

        _receivedAttestations[recipient][ao].push(uuid);
        _sentAttestations[msg.sender][ao].push(uuid);

        _db[uuid] = attestation;
        attestationsCount++;

        if (refUUID != 0) {
            require(isAttestationValid(refUUID), "ERR_NO_ATTESTATION");
            _relatedAttestations[refUUID].push(uuid);
        }

        emit Attested(recipient, msg.sender, uuid, ao);

        return uuid;
    }

    /// @dev Revokes an existing attestation to a specific AO.
    ///
    /// @param uuid The UUID of the attestation to revoke.
    function revoke(bytes32 uuid) public {
        Attestation storage attestation = _db[uuid];
        require(attestation._uuid != EMPTY_UUID, "ERR_NO_ATTESTATION");
        require(attestation._from == msg.sender, "ERR_ACCESS_DENIED");
        require(attestation._revocationTime == 0, "ERR_ALREADY_REVOKED");

        attestation._revocationTime = block.timestamp;

        emit Revoked(attestation._to, msg.sender, uuid, attestation._ao);
    }

    /// @dev Returns an existing attestation by UUID.
    ///
    /// @param uuid The UUID of the attestation to retrieve.
    ///
    /// @return The attestation data members.
    function getAttestation(bytes32 uuid)
        public
        view
        returns (
            bytes32,
            uint256,
            address,
            address,
            uint256,
            uint256,
            uint256,
            bytes32,
            bytes memory
        )
    {
        Attestation memory attestation = _db[uuid];

        return (
            attestation._uuid,
            attestation._ao,
            attestation._to,
            attestation._from,
            attestation._time,
            attestation._expirationTime,
            attestation._revocationTime,
            attestation._refUUID,
            attestation._data
        );
    }

    /// @dev Checks whether an attestation exists.
    ///
    /// @param uuid The UUID of the attestation to retrieve.
    ///
    /// @return Whether an attestation exists.
    function isAttestationValid(bytes32 uuid) public view returns (bool) {
        return _db[uuid]._uuid != 0;
    }

    /// @dev Returns all received attestation UUIDs.
    ///
    /// @param recipient The recipient the attestation.
    /// @param ao The ID of the AO.
    /// @param start The offset to start from.
    /// @param length The number of total members to retrieve.
    /// @param reverseOrder Whether the offset starts from the end and the data is returned in reverse.
    ///
    /// @return An array of attestation UUIDs.
    function getReceivedAttestationUUIDs(
        address recipient,
        uint256 ao,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) public view returns (bytes32[] memory) {
        return _sliceUUIDs(_receivedAttestations[recipient][ao], start, length, reverseOrder);
    }

    /// @dev Returns the number of received attestation UUIDs.
    ///
    /// @param recipient The recipient the attestation.
    /// @param ao The ID of the AO.
    ///
    /// @return The number of attestations.
    function getReceivedAttestationUUIDsCount(address recipient, uint256 ao) public view returns (uint256) {
        return _receivedAttestations[recipient][ao].length;
    }

    /// @dev Returns all sent attestation UUIDs.
    ///
    /// @param attester The recipient the attestation.
    /// @param ao The ID of the AO.
    /// @param start The offset to start from.
    /// @param length The number of total members to retrieve.
    /// @param reverseOrder Whether the offset starts from the end and the data is returned in reverse.
    ///
    /// @return An array of attestation UUIDs.
    function getSentAttestationUUIDs(
        address attester,
        uint256 ao,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) public view returns (bytes32[] memory) {
        return _sliceUUIDs(_sentAttestations[attester][ao], start, length, reverseOrder);
    }

    /// @dev Returns the number of sent attestation UUIDs.
    ///
    /// @param recipient The recipient the attestation.
    /// @param ao The ID of the AO.
    ///
    /// @return The number of attestations.
    function getSentAttestationUUIDsCount(address recipient, uint256 ao) public view returns (uint256) {
        return _sentAttestations[recipient][ao].length;
    }

    /// @dev Returns all attestations related to a specific attestation.
    ///
    /// @param uuid The UUID of the attestation to retrieve.
    /// @param start The offset to start from.
    /// @param length The number of total members to retrieve.
    /// @param reverseOrder Whether the offset starts from the end and the data is returned in reverse.
    ///
    /// @return An array of attestation UUIDs.
    function getRelatedAttestationUUIDs(
        bytes32 uuid,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) public view returns (bytes32[] memory) {
        return _sliceUUIDs(_relatedAttestations[uuid], start, length, reverseOrder);
    }

    /// @dev Returns the number of related attestation UUIDs.
    ///
    /// @param uuid The UUID of the attestation to retrieve.
    ///
    /// @return The number of related attestations.
    function getRelatedAttestationUUIDsCount(bytes32 uuid) public view returns (uint256) {
        return _relatedAttestations[uuid].length;
    }

    /// @dev Calculates a UUID for a given attestation.
    ///
    /// @param attestation The input attestation.
    function _getUUID(Attestation memory attestation) private view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    attestation._ao,
                    HASH_SEPARATOR,
                    attestation._to,
                    HASH_SEPARATOR,
                    attestation._from,
                    HASH_SEPARATOR,
                    attestation._time,
                    HASH_SEPARATOR,
                    attestation._expirationTime,
                    HASH_SEPARATOR,
                    attestation._data,
                    HASH_SEPARATOR,
                    attestationsCount,
                    HASH_SEPARATOR
                )
            );
    }

    /// @dev Returns a slice in an array of attestation UUIDs.
    ///
    /// @param uuids The array of attestation UUIDs.
    /// @param start The offset to start from.
    /// @param length The number of total members to retrieve.
    /// @param reverseOrder Whether the offset starts from the end and the data is returned in reverse.
    ///
    /// @return An array of attestation UUIDs.
    function _sliceUUIDs(
        bytes32[] memory uuids,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) private pure returns (bytes32[] memory) {
        uint256 attestationsLength = uuids.length;
        if (attestationsLength == 0) {
            return new bytes32[](0);
        }

        require(start < attestationsLength, "ERR_INVALID_OFFSET");

        uint256 len = length;
        if (attestationsLength < start + length) {
            len = attestationsLength - start;
        }

        bytes32[] memory res = new bytes32[](len);

        for (uint256 i = 0; i < len; ++i) {
            res[i] = uuids[reverseOrder ? attestationsLength - (start + i + 1) : start + i];
        }

        return res;
    }
}
