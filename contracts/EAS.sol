// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;
pragma abicoder v2;

import "./Types.sol";
import "./IEAS.sol";
import "./IAORegistry.sol";

/// @title EAS - Ethereum Attestation Service
contract EAS is IEAS {
    string public constant VERSION = "0.3";

    // A terminator used when concatenating and hashing multiple fields.
    string private constant HASH_TERMINATOR = "@";

    // The AO global registry.
    IAORegistry private immutable _aoRegistry;

    // The EIP712 verifier used to verify signed attestations.
    IEIP712Verifier private immutable _eip712Verifier;

    // A mapping between attestations and their corresponding attestations.
    mapping(bytes32 => bytes32[]) private _relatedAttestations;

    // A mapping between an account and its received attestations.
    mapping(address => mapping(bytes32 => bytes32[])) private _receivedAttestations;

    // A mapping between an account and its sent attestations.
    mapping(address => mapping(bytes32 => bytes32[])) private _sentAttestations;

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

    /// @inheritdoc IEAS
    function getAORegistry() external view override returns (IAORegistry) {
        return _aoRegistry;
    }

    /// @inheritdoc IEAS
    function getEIP712Verifier() external view override returns (IEIP712Verifier) {
        return _eip712Verifier;
    }

    /// @inheritdoc IEAS
    function getAttestationsCount() external view override returns (uint256) {
        return _attestationsCount;
    }

    /// @inheritdoc IEAS
    function attest(
        address recipient,
        bytes32 ao,
        uint256 expirationTime,
        bytes32 refUUID,
        bytes calldata data
    ) public payable virtual override returns (bytes32) {
        return _attest(recipient, ao, expirationTime, refUUID, data, msg.sender);
    }

    /// @inheritdoc IEAS
    function attestByDelegation(
        address recipient,
        bytes32 ao,
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

    /// @inheritdoc IEAS
    function revoke(bytes32 uuid) external virtual override {
        return _revoke(uuid, msg.sender);
    }

    /// @inheritdoc IEAS
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

    /// @inheritdoc IEAS
    function getAttestation(bytes32 uuid) external view override returns (Attestation memory) {
        return _db[uuid];
    }

    /// @inheritdoc IEAS
    function isAttestationValid(bytes32 uuid) public view override returns (bool) {
        return _db[uuid].uuid != 0;
    }

    /// @inheritdoc IEAS
    function getReceivedAttestationUUIDs(
        address recipient,
        bytes32 ao,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) external view override returns (bytes32[] memory) {
        return _sliceUUIDs(_receivedAttestations[recipient][ao], start, length, reverseOrder);
    }

    /// @inheritdoc IEAS
    function getReceivedAttestationUUIDsCount(address recipient, bytes32 ao) external view override returns (uint256) {
        return _receivedAttestations[recipient][ao].length;
    }

    /// @inheritdoc IEAS
    function getSentAttestationUUIDs(
        address attester,
        bytes32 ao,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) external view override returns (bytes32[] memory) {
        return _sliceUUIDs(_sentAttestations[attester][ao], start, length, reverseOrder);
    }

    /// @inheritdoc IEAS
    function getSentAttestationUUIDsCount(address recipient, bytes32 ao) external view override returns (uint256) {
        return _sentAttestations[recipient][ao].length;
    }

    /// @inheritdoc IEAS
    function getRelatedAttestationUUIDs(
        bytes32 uuid,
        uint256 start,
        uint256 length,
        bool reverseOrder
    ) external view override returns (bytes32[] memory) {
        return _sliceUUIDs(_relatedAttestations[uuid], start, length, reverseOrder);
    }

    /// @inheritdoc IEAS
    function getRelatedAttestationUUIDsCount(bytes32 uuid) external view override returns (uint256) {
        return _relatedAttestations[uuid].length;
    }

    /// @dev Attests to a specific AO.
    ///
    /// @param recipient The recipient the attestation.
    /// @param ao The UIID of the AO.
    /// @param expirationTime The expiration time of the attestation.
    /// @param refUUID An optional related attestation's UUID.
    /// @param data The additional attestation data.
    /// @param attester The attesting account.
    ///
    /// @return The UUID of the new attestation.
    function _attest(
        address recipient,
        bytes32 ao,
        uint256 expirationTime,
        bytes32 refUUID,
        bytes calldata data,
        address attester
    ) private returns (bytes32) {
        require(expirationTime > block.timestamp, "ERR_INVALID_EXPIRATION_TIME");

        AORecord memory aoRecord = _aoRegistry.getAO(ao);
        require(aoRecord.uuid != EMPTY_UUID, "ERR_INVALID_AO");
        require(
            address(aoRecord.verifier) == address(0x0) ||
                aoRecord.verifier.verify(recipient, aoRecord.schema, data, expirationTime, attester, msg.value),
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
    function _revoke(bytes32 uuid, address attester) private {
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
    ///
    /// @return Attestation UUID.
    function _getUUID(Attestation memory attestation) private view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    attestation.ao,
                    attestation.to,
                    attestation.from,
                    attestation.time,
                    attestation.expirationTime,
                    attestation.data,
                    HASH_TERMINATOR,
                    _attestationsCount
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
