// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

// prettier-ignore
import {
    EIP712Proxy,
    DelegatedProxyAttestationRequest,
    DelegatedProxyRevocationRequest,
    MultiDelegatedProxyAttestationRequest,
    MultiDelegatedProxyRevocationRequest
} from "../EIP712Proxy.sol";

import { IEAS } from "../../../IEAS.sol";

/**
 * @title A sample EIP712 proxy that allows only a specific address to attest.
 */
contract PermissionedEIP712Proxy is EIP712Proxy, Ownable {
    constructor(IEAS eas, string memory name) EIP712Proxy(eas, name) {}

    /**
     * @inheritdoc EIP712Proxy
     */
    function attestByDelegation(
        DelegatedProxyAttestationRequest calldata delegatedRequest
    ) public payable override onlyOwner returns (bytes32) {
        return super.attestByDelegation(delegatedRequest);
    }

    /**
     * @inheritdoc EIP712Proxy
     */
    function multiAttestByDelegation(
        MultiDelegatedProxyAttestationRequest[] calldata multiDelegatedRequests
    ) public payable override onlyOwner returns (bytes32[] memory) {
        return super.multiAttestByDelegation(multiDelegatedRequests);
    }

    /**
     * @inheritdoc EIP712Proxy
     */
    function revokeByDelegation(
        DelegatedProxyRevocationRequest calldata delegatedRequest
    ) public payable override onlyOwner {
        super.revokeByDelegation(delegatedRequest);
    }

    /**
     * @inheritdoc EIP712Proxy
     */
    function multiRevokeByDelegation(
        MultiDelegatedProxyRevocationRequest[] calldata multiDelegatedRequests
    ) public payable override onlyOwner {
        super.multiRevokeByDelegation(multiDelegatedRequests);
    }
}
