// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

/// @title The interface of an optional AO verifier, submitted via the global AO registry.
interface IAOVerifier {
    /// @dev Verifies whether the specified attestation data conforms to the spec.
    ///
    /// @param _recipient The recipient the attestation.
    /// @param _schema The AO data schema.
    /// @param _data The actual attestation data.
    /// @param _expirationTime The expiration time of the attestation.
    /// @param _msgSender The sender of the original attestation message.
    /// @param _msgValue The number of wei send with the original attestation message.
    ///
    /// @return Whether the data is valid according to the scheme.
    function verify(
        address _recipient,
        bytes calldata _schema,
        bytes calldata _data,
        uint256 _expirationTime,
        address _msgSender,
        uint256 _msgValue
    ) external view returns (bool);
}
