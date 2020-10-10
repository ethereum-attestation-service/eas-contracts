// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./AORegistry.sol";

/// @title EAS - Ethereum Attestation Service
contract EAS {
    string public constant VERSION = "0.1";

    bytes32 private constant EMPTY_UUID = bytes32(0x0);
    string private constant HASH_SEPARATOR = "@";

    // A data struct representing a single attestation.
    struct Attestation {
        bytes32 uuid;
        uint256 ao;
        address to;
        address from;
        uint256 time;
        uint256 expirationTime;
        uint256 revocationTime;
        bytes data;
    }

    // A data struct representing attestations to a specific AO (Attestation Object) by their UIIDs.
    struct AO {
        // A list of attestations IDs, belonging to this AO.
        bytes32[] attestationUIIDs;
    }

    // The AO global registry.
    AORegistry public aoRegistry;

    // A mapping between an account and its received attestations.
    mapping(address => mapping(uint256 => AO)) private receivedAttestations;

    // A mapping between an account and its sent attestations.
    mapping(address => mapping(uint256 => AO)) private sentAttestations;

    // A global mapping between attestations and their UUIDs.
    mapping(bytes32 => Attestation) private db;

    // A global counter for the total number of attestations.
    uint256 public attestationsCount;

    /// @dev Triggered when an attestation has been made.
    ///
    /// @param _recipient The recipient the attestation.
    /// @param _attester The attesting account.
    /// @param _uuid The UUID the revoked attestation.
    /// @param _ao The ID of the AO.
    event Attested(address indexed _recipient, address indexed _attester, bytes32 indexed _uuid, uint256 _ao);

    /// @dev Triggered when an attestation has been revoked.
    ///
    /// @param _recipient The recipient the attestation.
    /// @param _attester The attesting account.
    /// @param _ao The ID of the AO.
    /// @param _uuid The UUID the revoked attestation.
    event Revoked(address indexed _recipient, address indexed _attester, bytes32 indexed _uuid, uint256 _ao);

    /// @dev Creates a new EAS instance.
    ///
    /// @param _aoRegistry The address of the global AO registry.
    constructor(AORegistry _aoRegistry) public {
        require(address(_aoRegistry) != address(0x0), "ERR_INVALID_ADDRESS");

        aoRegistry = _aoRegistry;
    }

    /// @dev Attests to a specific AO.
    ///
    /// @param _recipient The recipient the attestation.
    /// @param _ao The ID of the AO.
    /// @param _expirationTime The expiration time of the attestation.
    /// @param _data The additional attestation data.
    ///
    /// @return The UUID of the new attestation.
    function attest(
        address _recipient,
        uint256 _ao,
        uint256 _expirationTime,
        bytes calldata _data
    ) public payable returns (bytes32) {
        require(_expirationTime > block.timestamp, "ERR_INVALID_EXPIRATION_TIME");

        uint256 id;
        bytes memory schema;
        IAOVerifier verifier;
        (id, schema, verifier) = aoRegistry.getAO(_ao);

        require(id > 0, "ERR_INVALID_AO");
        require(
            address(verifier) == address(0x0) ||
                verifier.verify(_recipient, schema, _data, _expirationTime, msg.sender, msg.value),
            "ERR_INVALID_ATTESTATION_DATA"
        );

        Attestation memory attestation = Attestation({
            uuid: EMPTY_UUID,
            ao: _ao,
            to: _recipient,
            from: msg.sender,
            time: block.timestamp,
            expirationTime: _expirationTime,
            revocationTime: 0,
            data: _data
        });

        bytes32 uuid = getUUID(attestation);
        attestation.uuid = uuid;

        AO storage receivedAo = receivedAttestations[_recipient][_ao];
        receivedAo.attestationUIIDs.push(uuid);

        AO storage sentAo = sentAttestations[msg.sender][_ao];
        sentAo.attestationUIIDs.push(uuid);

        db[uuid] = attestation;
        attestationsCount++;

        emit Attested(_recipient, msg.sender, uuid, _ao);

        return uuid;
    }

    /// @dev Revokes an existing attestation to a specific AO.
    ///
    /// @param _uuid The UUID of the attestation to revoke.
    function revoke(bytes32 _uuid) public {
        Attestation storage attestation = db[_uuid];
        require(attestation.uuid != EMPTY_UUID, "ERR_NO_ATTESTATION");
        require(attestation.from == msg.sender, "ERR_ACCESS_DENIED");
        require(attestation.revocationTime == 0, "ERR_ALREADY_REVOKED");

        attestation.revocationTime = block.timestamp;

        emit Revoked(attestation.to, msg.sender, _uuid, attestation.ao);
    }

    /// @dev Returns an existing attestation by UUID.
    ///
    /// @param _uuid The UUID of the attestation to retrieve.
    ///
    /// @return The attestation data members.
    function getAttestation(bytes32 _uuid)
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
            bytes memory
        )
    {
        Attestation memory attestation = db[_uuid];

        return (
            attestation.uuid,
            attestation.ao,
            attestation.to,
            attestation.from,
            attestation.time,
            attestation.expirationTime,
            attestation.revocationTime,
            attestation.data
        );
    }

    /// @dev Returns all received attestations UUIDs.
    ///
    /// @param _recipient The recipient the attestation.
    /// @param _ao The ID of the AO.
    ///
    /// @return An array of attestation UUIDs.
    function getReceivedAttestationsUUIDs(address _recipient, uint256 _ao) public view returns (bytes32[] memory) {
        return receivedAttestations[_recipient][_ao].attestationUIIDs;
    }

    /// @dev Returns all sent attestations UUIDs.
    ///
    /// @param _attester The recipient the attestation.
    /// @param _ao The ID of the AO.
    ///
    /// @return An array of attestation UUIDs.
    function getSentAttestationsUUIDs(address _attester, uint256 _ao) public view returns (bytes32[] memory) {
        return sentAttestations[_attester][_ao].attestationUIIDs;
    }

    /// @dev Calculates a UUID for a given attestation.
    ///
    /// @param _attestation The input attestation.
    function getUUID(Attestation memory _attestation) private view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    _attestation.ao,
                    HASH_SEPARATOR,
                    _attestation.to,
                    HASH_SEPARATOR,
                    _attestation.from,
                    HASH_SEPARATOR,
                    _attestation.time,
                    HASH_SEPARATOR,
                    _attestation.expirationTime,
                    HASH_SEPARATOR,
                    _attestation.data,
                    HASH_SEPARATOR,
                    attestationsCount,
                    HASH_SEPARATOR
                )
            );
    }
}
