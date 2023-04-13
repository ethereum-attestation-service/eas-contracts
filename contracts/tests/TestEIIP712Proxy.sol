// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import { IEAS } from "../IEAS.sol";
import { EIP712Proxy } from "../EIP712Proxy.sol";
import { DelegatedAttestationRequest, DelegatedRevocationRequest } from "../IEASDelegated.sol";

contract TestEIP712Proxy is EIP712Proxy {
    constructor(IEAS eas, string memory name) EIP712Proxy(eas, name) {}

    function verifyAttest(DelegatedAttestationRequest memory request) external {
        _verifyAttest(request);
    }

    function verifyRevoke(DelegatedRevocationRequest memory request) external {
        _verifyRevoke(request);
    }
}
