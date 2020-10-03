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
        string data;
    }

    // A data struct representing attestations to a specific category (by their IDs), as well as a reverse lookup for
    // attesters.
    struct Category {
        // Whether it's possible to attest to this category.
        bool enabled;

        // The value of the attestation category.
        string data;

        // A list of attestations IDs, belonging to this category.
        uint256[] attestationIds;

        // Reverse lookup between attesters and their respective attestations.
        mapping (address => uint256) lookup;
    }

    // A mapping between an account, its attestation categories and their respective attestations.
    mapping (address => mapping (uint16 => Category)) private attestations;

    // Count of attestations.
    uint256 public attestationsCount;

    // A global mapping between attestations and their IDs.
    mapping (uint256 => Attestation) private db;

    /// @dev Triggered when an attestation category is enabled.
    ///
    /// @param _recipient The recipient the attestation.
    /// @param _categoryId The ID of the attestation category.
    event CategoryEnabled(address indexed _recipient, uint16 indexed _categoryId);

    /// @dev Triggered when an attestation category is disabled.
    ///
    /// @param _recipient The recipient the attestation.
    /// @param _categoryId The ID of the attestation category.
    event CategoryDisabled(address indexed _recipient, uint16 indexed _categoryId);

    /// @dev Triggered when the data of an attestation category is updated.
    ///
    /// @param _recipient The recipient the attestation.
    /// @param _categoryId The ID of the attestation category.
    /// @param _data The value of the attestation category.
    event CategoryDataUpdated(address indexed _recipient, uint16 indexed _categoryId, string _data);

    /// @dev Triggered when an attestation has been made.
    ///
    /// @param _attester The attesting account.
    /// @param _recipient The recipient the attestation.
    /// @param _categoryId The ID of the attestation category.
    event Attested(address indexed _attester, address indexed _recipient, uint16 indexed _categoryId);

    /// @dev Enables attestations to a specific attestation category.
    ///
    /// @param _categoryId The ID of the attestation category.
    function enableCategory(uint16 _categoryId) public {
        setCategory(_categoryId, true);
    }

    /// @dev Disables attestations to a specific attestation category.
    ///
    /// @param _categoryId The ID of the attestation category.
    function disableCategory(uint16 _categoryId) public {
        setCategory(_categoryId, false);
    }

    /// @dev Sets the value of the attestation category.
    ///
    /// @param _categoryId The ID of the attestation category.
    /// @param _data The value of the attestation category.
    ///
    /// @notice Setting a new data will invalidate all existing attestations.
    function setCategoryData(uint16 _categoryId, string calldata _data) public {
        Category storage category = attestations[msg.sender][_categoryId];

        // Check if the data is actually different than the existing data.
        string memory data = category.data;

        if (bytes(data).length == bytes(_data).length &&
            keccak256(abi.encodePacked(data)) == keccak256(abi.encodePacked(_data))) {
            return;
        }

        category.data = _data;

        // Invalidate all existing attestations.
        //
        // Note: we are aware to the fact, in the case of large number of existing attestation, this method can exceed
        // the the block gas limit and fail. This issue will be handled and mitigated in future versions.
        invalidateAttestations(category);

        emit CategoryDataUpdated(msg.sender, _categoryId, _data);
    }

    /// @dev Attests to the specified category.
    ///
    /// @param _recipient The recipient the attestation.
    /// @param _categoryId The ID of the attestation category.
    /// @param _data The additional attestation data.
    function attest(address _recipient, uint16 _categoryId, string calldata _data) public {
        Category storage category = attestations[_recipient][_categoryId];

        require(category.enabled && _recipient != msg.sender, "ERR_INVALID_CATEGORY_ID");

        // If the msg.sender has already attested to this category - just update its attestation time and data.
        uint256 attestationId = category.lookup[msg.sender];
        if (attestationId != 0) {
            Attestation storage attestation = db[attestationId];
            attestation.time = block.timestamp;
            attestation.data = _data;
        } else {
            Attestation memory attestation = Attestation({
                from: msg.sender,
                time: block.timestamp,
                data: _data
            });

            uint256 newAttestationId = ++attestationsCount;

            category.attestationIds.push(newAttestationId);
            category.lookup[msg.sender] = newAttestationId;

            db[newAttestationId] = attestation;
        }

        emit Attested(msg.sender, _recipient, _categoryId);
    }

    /// @dev Enables/disables attesting to a specific attestation category.
    ///
    /// @param _categoryId The ID of the attestation category.
    /// @param _enable Whether to enable/disable attestation to a specific category.
    function setCategory(uint16 _categoryId, bool _enable) private {
        Category storage category = attestations[msg.sender][_categoryId];

        if (category.enabled == _enable) {
            return;
        }

        category.enabled = _enable;

        if (_enable) {
            emit CategoryEnabled(msg.sender, _categoryId);
        } else {
            emit CategoryDisabled(msg.sender, _categoryId);
        }
    }

    /// @dev Invalidation attestations to a specific category.
    /// @param _category The attestation category.
    function invalidateAttestations(Category storage _category) private {
        uint256 length = _category.attestationIds.length;
        for (uint256 i = 0; i < length; ++i) {
            uint256 id = _category.attestationIds[i];
            Attestation memory attestation = db[id];

            delete _category.lookup[attestation.from];
            delete db[id];
        }

        delete _category.attestationIds;
        attestationsCount = attestationsCount.sub(length);
    }
}
