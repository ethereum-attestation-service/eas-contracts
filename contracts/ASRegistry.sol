// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;
pragma abicoder v2;

import "./Types.sol";
import "./IASRegistry.sol";
import "./IASVerifier.sol";

/**
 * @title The global AS registry.
 */
contract ASRegistry is IASRegistry {
    string public constant VERSION = "0.4";

    // The global mapping between AS records and their IDs.
    mapping(bytes32 => ASRecord) private _registry;

    // The global counter for the total number of attestations.
    uint256 private _asCount;

    /**
     * @inheritdoc IASRegistry
     */
    function register(bytes calldata schema, IASVerifier verifier) external override returns (bytes32) {
        uint256 index = ++_asCount;

        ASRecord memory asRecord = ASRecord({uuid: EMPTY_UUID, index: index, schema: schema, verifier: verifier});

        bytes32 uuid = _getUUID(asRecord);
        require(_registry[uuid].uuid == EMPTY_UUID, "ERR_ALREADY_EXISTS");

        asRecord.uuid = uuid;
        _registry[uuid] = asRecord;

        emit Registered(uuid, index, schema, verifier, msg.sender);

        return uuid;
    }

    /**
     * @inheritdoc IASRegistry
     */
    function getAS(bytes32 uuid) external view override returns (ASRecord memory) {
        return _registry[uuid];
    }

    /**
     * @inheritdoc IASRegistry
     */
    function getASCount() external view override returns (uint256) {
        return _asCount;
    }

    /**
     * @dev Calculates a UUID for a given AS.
     *
     * @param asRecord The input AS.
     *
     * @return AS UUID.
     */
    function _getUUID(ASRecord memory asRecord) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(asRecord.schema, asRecord.verifier));
    }
}
