// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { Attestation } from "./IEAS.sol";

/**
 * @title The interface of an optional schema resolver.
 */
interface ISchemaResolver {
    /**
     * @dev Returns whether the resolver supports ETH transfers.
     */
    function isPayable() external pure returns (bool);

    /**
     * @dev Processes an attestation and verifies whether it's valid.
     *
     * @param attestation The new attestation.
     *
     * @return Whether the attestation is valid.
     */
    function attest(Attestation calldata attestation) external payable returns (bool);

    /**
     * @dev Processes an attestation revocation and verifies if it can be revoked.
     *
     * @param attestation The existing attestation to be revoked.
     *
     * @return Whether the attestation can be revoked.
     */
    function revoke(Attestation calldata attestation) external payable returns (bool);
}
