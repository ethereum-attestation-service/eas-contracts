// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "./IEAS.sol";

/// @title EAS - Ethereum Attestation Service
contract EAS is IEAS {
    string public constant VERSION = "0.2";

    bytes32 private constant EMPTY_UUID = 0;
    string private constant HASH_SEPARATOR = "@";

    // The AO global registry.
    IAORegistry private immutable _aoRegistry;

    // The EIP712 verifier used to verify signed attestations.
    IEIP712Verifier private immutable _eip712Verifier;

    // A mapping between attestations and their corresponding attestations.
    mapping(bytes32 => bytes32[]) private _relatedAttestations;

    // A mapping between an account and its received attestations.
    mapping(address => mapping(uint256 => bytes32[])) private _receivedAttestations;

    // A mapping between an account and its sent attestations.
    mapping(address => mapping(uint256 => bytes32[])) private _sentAttestations;

    // The global mapping between attestations and their UUIDs.
    mapping(bytes32 => Attestation) private _db;

    // The global counter for the total number of attestations.
    uint256 private _attestationsCount;

    /// @dev Creates a new EAS instance.
    ///
    /// @param registry The address of the global AO registry.
    /// @param verifier The address of the EIP712 verifier.
    constructor(IAORegistry registry, IEIP712Verifier verifier) {
        require(address(registry) != address(0x0), "ERR_INVALID_REGISTRY");
        require(address(verifier) != address(0x0), "ERR_INVALID_EIP712_VERIFIER");

        _aoRegistry = registry;
        _eip712Verifier = verifier;
    }

    /// @dev Returns the address of the AO global registry.
    ///
    /// @return The address of the AO global registry.
    function getAORegistry() external view override returns (IAORegistry) {
        return _aoRegistry;
    }

    /// @dev Returns the address of the EIP712 verifier used to verify signed attestations.
    ///
    /// @return The address of the EIP712 verifier used to verify signed attestations.
    function getEIP712Verifier() external view override returns (IEIP712Verifier) {
        return _eip712Verifier;
    }

    /// @dev Returns the global counter for the total number of attestations.
    ///
    /// @return The global counter for the total number of attestations.
    function getAttestationsCount() external view override returns (uint256) {
        return _attestationsCount;
    }

    /// @dev Attests to a specific AO.
    ///
    /// @param recipient The recipient the attestation.
    /// @param ao The ID of the AO.
    /// @param expirationTime The expiration time of the attestation.
    /// @param refUUID An optional related attestation's UUID.
    /// @param data The additional attestation data.
    ///
    /// @return The UUID of the new attestation.
    function attest(
        address recipient,
        uint256 ao,
        uint256 expirationTime,
        bytes32 refUUID,
        bytes calldata data
    ) public payable virtual override returns (bytes32) {
        return _attest(recipient, ao, expirationTime, refUUID, data, msg.sender);
    }

    /// @dev Attests to a specific AO using a provided EIP712 signature.
    ///
    /// @param recipient The recipient the attestation.
    /// @param ao The ID of the AO.
    /// @param expirationTime The expiration time of the attestation.
    /// @param refUUID An optional related attestation's UUID.
    /// @param data The additional attestation data.
    /// @param attester The attesting account.
    /// @param v The recovery ID.
    /// @param r The x-coordinate of the nonce R.
    /// @param s The signature data.
    ///
    /// @return The UUID of the new attestation.
    function attestByDelegation(
        address recipient,
        uint256 ao,
        uint256 expirationTime,
        bytes32 refUUID,
        bytes calldata data,
        address attester,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public payable virtual override returns (bytes32) {
        _eip712Verifier.attest(recipient, ao, expirationTime, refUUID, data, attester, v, r, s);

        return _attest(recipient, ao, expirationTime, refUUID, data, attester);
    }

    /// @dev Revokes an existing attestation to a specific AO.
    ///
    /// @param uuid The UUID of the attestation to revoke.
    function revoke(bytes32 uuid) external virtual override {
        return _revoke(uuid, msg.sender);
    }

    /// @dev Attests to a specific AO using a provided EIP712 signature.
    ///
    /// @param uuid The UUID of the attestation to revoke.
    /// @param attester The attesting account.
    /// @param v The recovery ID.
    /// @param r The x-coordinate of the nonce R.
    /// @param s The signature data.
    function revokeByDelegation(
        bytes32 uuid,
        address attester,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external virtual override {
        _eip712Verifier.revoke(uuid, attester, v, r, s);

        _revoke(uuid, attester);
    }

    /// @dev Returns an existing attestation by UUID.
    ///
    /// @param uuid The UUID of the attestation to retrieve.
    ///
    /// @return The attestation data members.
    function getAttestation(bytes32 uuid)
        external
        view
        override
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
            attestation.uuid,
            attestation.ao,
            attestation.to,
            attestation.from,
            attestation.time,
            attestation.expirationTime,
            attestation.revocationTime,
            attestation.refUUID,
            attestation.data
        );
    }

    /// @dev Checks whether an attestation exists.
    ///
    /// @param uuid The UUID of the attestation to retrieve.
    ///
    /// @return Whether an attestation exists.
    function isAttestationValid(bytes32 uuid) public view override returns (bool) {
        return _db[uuid].uuid != 0;
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
    ) external view override returns (bytes32[] memory) {
        return _sliceUUIDs(_receivedAttestations[recipient][ao], start, length, reverseOrder);
    }

    /// @dev Returns the number of received attestation UUIDs.
    ///
    /// @param recipient The recipient the attestation.
    /// @param ao The ID of the AO.
    ///
    /// @return The number of attestations.
    function getReceivedAttestationUUIDsCount(address recipient, uint256 ao) external view override returns (uint256) {
        return _receivedAttestations[recipient][ao].length;
    }

    /// @dev Returns all sent attestation UUIDs.
    ///
    /// @param attester The attesting account.
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
    ) external view override returns (bytes32[] memory) {
        return _sliceUUIDs(_sentAttestations[attester][ao], start, length, reverseOrder);
    }

    /// @dev Returns the number of sent attestation UUIDs.
    ///
    /// @param recipient The recipient the attestation.
    /// @param ao The ID of the AO.
    ///
    /// @return The number of attestations.
    function getSentAttestationUUIDsCount(address recipient, uint256 ao) external view override returns (uint256) {
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
    ) external view override returns (bytes32[] memory) {
        return _sliceUUIDs(_relatedAttestations[uuid], start, length, reverseOrder);
    }

    /// @dev Returns the number of related attestation UUIDs.
    ///
    /// @param uuid The UUID of the attestation to retrieve.
    ///
    /// @return The number of related attestations.
    function getRelatedAttestationUUIDsCount(bytes32 uuid) external view override returns (uint256) {
        return _relatedAttestations[uuid].length;
    }

    /// @dev Attests to a specific AO.
    ///
    /// @param recipient The recipient the attestation.
    /// @param ao The ID of the AO.
    /// @param expirationTime The expiration time of the attestation.
    /// @param refUUID An optional related attestation's UUID.
    /// @param data The additional attestation data.
    /// @param attester The attesting account.
    ///
    /// @return The UUID of the new attestation.
    function _attest(
        address recipient,
        uint256 ao,
        uint256 expirationTime,
        bytes32 refUUID,
        bytes calldata data,
        address attester
    ) private returns (bytes32) {
        require(expirationTime > block.timestamp, "ERR_INVALID_EXPIRATION_TIME");

        uint256 id;
        bytes memory schema;
        IAOVerifier verifier;
        (id, schema, verifier) = _aoRegistry.getAO(ao);

        require(id > 0, "ERR_INVALID_AO");
        require(
            address(verifier) == address(0x0) ||
                verifier.verify(recipient, schema, data, expirationTime, attester, msg.value),
            "ERR_INVALID_ATTESTATION_DATA"
        );

        Attestation memory attestation = Attestation({
            uuid: EMPTY_UUID,
            ao: ao,
            to: recipient,
            from: attester,
            time: block.timestamp,
            expirationTime: expirationTime,
            revocationTime: 0,
            refUUID: refUUID,
            data: data
        });

        bytes32 uuid = _getUUID(attestation);
        attestation.uuid = uuid;

        _receivedAttestations[recipient][ao].push(uuid);
        _sentAttestations[attester][ao].push(uuid);

        _db[uuid] = attestation;
        _attestationsCount++;

        if (refUUID != 0) {
            require(isAttestationValid(refUUID), "ERR_NO_ATTESTATION");
            _relatedAttestations[refUUID].push(uuid);
        }

        emit Attested(recipient, attester, uuid, ao);

        return uuid;
    }

    /// @dev Revokes an existing attestation to a specific AO.
    ///
    /// @param uuid The UUID of the attestation to revoke.
    /// @param attester The attesting account.
    function _revoke(bytes32 uuid, address attester) public {
        Attestation storage attestation = _db[uuid];
        require(attestation.uuid != EMPTY_UUID, "ERR_NO_ATTESTATION");
        require(attestation.from == attester, "ERR_ACCESS_DENIED");
        require(attestation.revocationTime == 0, "ERR_ALREADY_REVOKED");

        attestation.revocationTime = block.timestamp;

        emit Revoked(attestation.to, attester, uuid, attestation.ao);
    }

    /// @dev Calculates a UUID for a given attestation.
    ///
    /// @param attestation The input attestation.
    function _getUUID(Attestation memory attestation) private view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    attestation.ao,
                    HASH_SEPARATOR,
                    attestation.to,
                    HASH_SEPARATOR,
                    attestation.from,
                    HASH_SEPARATOR,
                    attestation.time,
                    HASH_SEPARATOR,
                    attestation.expirationTime,
                    HASH_SEPARATOR,
                    attestation.data,
                    HASH_SEPARATOR,
                    _attestationsCount,
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
