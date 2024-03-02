// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

import { ISemver } from "./ISemver.sol";

/// @title Semver
/// @notice A simple contract for managing contract versions.
contract Semver is ISemver {
    // Contract's major version number.
    uint256 private immutable _major;

    // Contract's minor version number.
    uint256 private immutable _minor;

    // Contract's patch version number.
    uint256 private immutable _patch;

    // Contract's pre-release identifier hash.
    bytes32 private immutable _prerelease

    /// @dev Create a new Semver instance.
    /// @param major Major version number.
    /// @param minor Minor version number.
    /// @param patch Patch version number.
    /// @param prerelease Pre-release version optional ascii string identifier.
    constructor(uint256 major, uint256 minor, uint256 patch, string memory prerelease) {
        _major = major;
        _minor = minor;
        _patch = patch;
        _prerelease = bytes(prerelease).length == 0 ? bytes32(0) : keccak256(prerelease);
    }

    /// @notice Returns the full semver contract version.
    /// @return Semver contract version as a string.
    function version() external view returns (string memory) {
        return string(abi.encodePacked(
            Strings.toString(_major), ".", 
            Strings.toString(_minor), ".", 
            Strings.toString(_patch), 
            _prereleaseAddOrEmpty()
        ));
    }

    function _prereleaseOrEmpty() internal pure returns(bytes memory) {
        return _prerelease == bytes32(0) ? bytes(0) : bytes.concat("-", abi.encodePacked(prerelease));
    }
}
