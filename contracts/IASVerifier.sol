// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

/**
 * @title The interface of an optional AS verifier, submitted via the global AS registry.
 */
interface IASVerifier {
    /**
     * @dev Verifies whether the specified attestation data conforms to the spec.
     *
     * @param recipient The recipient of the attestation.
     * @param schema The AS data schema.
     * @param data The actual attestation data.
     * @param expirationTime The expiration time of the attestation.
     * @param msgSender The sender of the original attestation message.
     * @param msgValue The number of wei send with the original attestation message.
     *
     * @return Whether the data is valid according to the scheme.
     */
    function verify(
        address recipient,
        bytes calldata schema,
        bytes calldata data,
        uint256 expirationTime,
        address msgSender,
        uint256 msgValue
    ) external view returns (bool);
}
