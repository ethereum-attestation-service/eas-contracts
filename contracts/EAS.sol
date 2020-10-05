// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";

/// @title EAS - Ethereum Attestation Service
contract EAS {
    using SafeMath for uint256;

    string constant public VERSION = "0.1";

    // A data struct representing a single attestation.
    struct Attestation {
        address from;
        uint256 time;
        uint256 expirationTime;
        string data;
    }

    // A data struct representing attestations to a specific AIO (by their IDs), as well as a reverse lookup for
    // attesters.
    struct AttestationIdentityObject {
        // Whether it's possible to attest to this AIO.
        bool enabled;

        // The value of the attestation AIO.
        string data;

        // A list of attestations IDs, belonging to this AIO.
        uint256[] attestationIds;

        // Reverse lookup between attesters and their respective attestations.
        mapping (address => uint256) lookup;
    }

    // A mapping between an account, its AIOs and their respective attestations.
    mapping (address => mapping (uint16 => AttestationIdentityObject)) private attestations;

    // Count of attestations.
    uint256 public attestationsCount;

    // A global mapping between attestations and their IDs.
    mapping (uint256 => Attestation) private db;

    /// @dev Triggered when an AIO is enabled.
    ///
    /// @param _recipient The recipient the attestation.
    /// @param _aio The ID of the AIO.
    event AIOEnabled(address indexed _recipient, uint16 indexed _aio);

    /// @dev Triggered when an AIO is disabled.
    ///
    /// @param _recipient The recipient the attestation.
    /// @param _aio The ID of the AIO.
    event AIODisabled(address indexed _recipient, uint16 indexed _aio);

    /// @dev Triggered when the data of an AIO is updated.
    ///
    /// @param _recipient The recipient the attestation.
    /// @param _aio The ID of the AIO.
    /// @param _data The value of the AIO.
    event AIODataUpdated(address indexed _recipient, uint16 indexed _aio, string _data);

    /// @dev Triggered when an attestation has been made.
    ///
    /// @param _attester The attesting account.
    /// @param _recipient The recipient the attestation.
    /// @param _aio The ID of the AIO.
    /// @param _expirationTime The expiration time of the attestation.
    event Attested(address indexed _attester, address indexed _recipient, uint16 indexed _aio, uint256 _expirationTime);

    /// @dev Enables attestations to a specific AIO.
    ///
    /// @param _aio The ID of the AIO.
    function enableAIO(uint16 _aio) public {
        setAIO(_aio, true);
    }

    /// @dev Disables attestations to a specific AIO.
    ///
    /// @param _aio The ID of the AIO.
    function disableAIO(uint16 _aio) public {
        setAIO(_aio, false);
    }

    /// @dev Sets the value of the AIO.
    ///
    /// @param _aio The ID of the AIO.
    /// @param _data The value of the AIO.
    ///
    /// @notice Setting a new data will invalidate all existing attestations.
    function setAIOData(uint16 _aio, string calldata _data) public {
        AttestationIdentityObject storage aio = attestations[msg.sender][_aio];

        // Check if the data is actually different than the existing data.
        string memory data = aio.data;

        if (bytes(data).length == bytes(_data).length &&
            keccak256(abi.encodePacked(data)) == keccak256(abi.encodePacked(_data))) {
            return;
        }

        aio.data = _data;

        // Invalidate all existing attestations.
        //
        // Note: we are aware to the fact, in the case of large number of existing attestation, this method can exceed
        // the the block gas limit and fail. This issue will be handled and mitigated in future versions.
        invalidateAttestations(aio);

        emit AIODataUpdated(msg.sender, _aio, _data);
    }

    /// @dev Attests to a specific AIO.
    ///
    /// @param _recipient The recipient the attestation.
    /// @param _aio The ID of the AIO.
    /// @param _expirationTime The expiration time of the attestation.
    /// @param _data The additional attestation data.
    function attest(address _recipient, uint16 _aio, uint256 _expirationTime, string calldata _data) public {
        AttestationIdentityObject storage aio = attestations[_recipient][_aio];

        require(aio.enabled && _recipient != msg.sender, "ERR_INVALID_AIO");
        require(_expirationTime > block.timestamp, "ERR_INVALID_EXPIRATION_TIME");

        // If the msg.sender has already attested to this AIO - just update its attestation data.
        uint256 attestationId = aio.lookup[msg.sender];
        if (attestationId != 0) {
            Attestation storage attestation = db[attestationId];
            attestation.time = block.timestamp;
            attestation.expirationTime = _expirationTime;
            attestation.data = _data;
        } else {
            Attestation memory attestation = Attestation({
                from: msg.sender,
                time: block.timestamp,
                expirationTime: _expirationTime,
                data: _data
            });

            uint256 newAttestationId = ++attestationsCount;

            aio.attestationIds.push(newAttestationId);
            aio.lookup[msg.sender] = newAttestationId;

            db[newAttestationId] = attestation;
        }

        emit Attested(msg.sender, _recipient, _aio, _expirationTime);
    }

    /// @dev Enables/disables attesting to a specific AIO.
    ///
    /// @param _aio The ID of the AIO.
    /// @param _enable Whether to enable/disable attestation to a specific AIO.
    function setAIO(uint16 _aio, bool _enable) private {
        AttestationIdentityObject storage aio = attestations[msg.sender][_aio];

        if (aio.enabled == _enable) {
            return;
        }

        aio.enabled = _enable;

        if (_enable) {
            emit AIOEnabled(msg.sender, _aio);
        } else {
            emit AIODisabled(msg.sender, _aio);
        }
    }

    /// @dev Invalidation attestations to a specific AIO.
    /// @param _aio The AIO.
    function invalidateAttestations(AttestationIdentityObject storage _aio) private {
        uint256 length = _aio.attestationIds.length;
        for (uint256 i = 0; i < length; ++i) {
            uint256 id = _aio.attestationIds[i];
            Attestation memory attestation = db[id];

            delete _aio.lookup[attestation.from];
            delete db[id];
        }

        delete _aio.attestationIds;
        attestationsCount = attestationsCount.sub(length);
    }
}
