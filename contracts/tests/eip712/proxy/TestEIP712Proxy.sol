// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import { IEAS } from "../../../IEAS.sol";
import { EIP712Proxy, DelegatedProxyAttestationRequest, DelegatedProxyRevocationRequest } from "../../../eip712/proxy/EIP712Proxy.sol";

contract TestEIP712Proxy is EIP712Proxy {
    constructor(IEAS eas, string memory name) EIP712Proxy(eas, name) {}

    function verifyAttest(DelegatedProxyAttestationRequest memory request) external {
        _verifyAttest(request);
    }

    function verifyRevoke(DelegatedProxyRevocationRequest memory request) external {
        _verifyRevoke(request);
    }
}
