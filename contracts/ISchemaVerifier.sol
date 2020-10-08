// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

/// @title The interface of an optional AO schema verifier, submitted via the global AO registry.
interface ISchemaVerifier {
    /// @dev Verifies whether the specified data conforms to the specified schema.
    ///
    /// @param _schema The AO data schema.
    /// @param _data The actual attestation data.
    ///
    /// @return Whether the data is valid according to the scheme.
    function verify(bytes calldata _schema, bytes calldata _data) external pure returns (bool);
}
