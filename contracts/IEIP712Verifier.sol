// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { DelegatedAttestationRequest, DelegatedRevocationRequest } from "./IEAS.sol";

/**
 * @title EIP712 typed signatures verifier for EAS delegated attestations interface.
 */
interface IEIP712Verifier {
    /**
     * @dev Returns the domain separator used in the encoding of the signatures for attest, and revoke.
     */
    function getDomainSeparator() external view returns (bytes32);

    /**
     * @dev Returns the current nonce per-account.
     *
     * @param account The requested account.
     *
     * @return The current nonce.
     */
    function getNonce(address account) external view returns (uint256);

    /**
     * @dev Verifies signed attestation.
     *
     * @param delegatedRequest The arguments of the delegated attestation request.
     */
    function attest(DelegatedAttestationRequest calldata delegatedRequest) external;

    /**
     * @dev Verifies signed revocations.
     *
     * @param delegatedRequest The arguments of the delegated revocation request.
     */
    function revoke(DelegatedRevocationRequest calldata delegatedRequest) external;
}
