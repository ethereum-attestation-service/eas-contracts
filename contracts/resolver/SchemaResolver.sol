// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { IEAS, Attestation } from "../IEAS.sol";

import { ISchemaResolver } from "./ISchemaResolver.sol";

/**
 * @title A base resolver contract
 */
abstract contract SchemaResolver is ISchemaResolver {
    error AccessDenied();
    error InvalidEAS();
    error NotPayable();

    // The version of the contract.
    string public constant VERSION = "0.19";

    // The global EAS contract.
    IEAS internal immutable _eas;

    /**
     * @dev Creates a new resolver.
     *
     * @param eas The address of the global EAS contract.
     */
    constructor(IEAS eas) {
        if (address(eas) == address(0)) {
            revert InvalidEAS();
        }

        _eas = eas;
    }

    /**
     * @dev Ensures that only the EAS contract can make this call.
     */
    modifier onlyEAS() {
        _onlyEAS();

        _;
    }

    /**
     * @inheritdoc ISchemaResolver
     */
    function isPayable() public pure virtual returns (bool) {
        return false;
    }

    /**
     * @dev ETH callback
     */
    receive() external payable virtual {
        if (!isPayable()) {
            revert NotPayable();
        }
    }

    /**
     * @inheritdoc ISchemaResolver
     */
    function attest(Attestation calldata attestation) external payable onlyEAS returns (bool) {
        return onAttest(attestation);
    }

    /**
     * @dev Processes an attestation revocation and verifies if it can be revoked.
     *
     * @param attestation The existing attestation to be revoked.
     *
     * @return Whether the attestation can be revoked.
     */
    function revoke(Attestation calldata attestation) external payable onlyEAS returns (bool) {
        return onRevoke(attestation);
    }

    /**
     * @dev A resolver callback that should be implemented by child contracts.
     *
     * @param attestation The new attestation.
     *
     * @return Whether the attestation is valid.
     */
    function onAttest(Attestation calldata attestation) internal virtual returns (bool);

    /**
     * @dev Processes an attestation revocation and verifies if it can be revoked.
     *
     * @param attestation The existing attestation to be revoked.
     *
     * @return Whether the attestation can be revoked.
     */
    function onRevoke(Attestation calldata attestation) internal virtual returns (bool);

    /**
     * @dev Ensures that only the EAS contract can make this call.
     */
    function _onlyEAS() private view {
        if (msg.sender != address(_eas)) {
            revert AccessDenied();
        }
    }
}
