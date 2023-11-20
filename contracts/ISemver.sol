// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @title ISemver
/// @notice A semver interface.
interface ISemver {
    /// @notice Returns the full semver contract version.
    /// @return Semver contract version as a string.
    function version() external view returns (string memory);
}
