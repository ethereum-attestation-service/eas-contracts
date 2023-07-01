// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import { EIP712Verifier } from "../../eip712/EIP712Verifier.sol";
import { DelegatedAttestationRequest, DelegatedRevocationRequest } from "../../IEAS.sol";
import { Semver } from "../../Semver.sol";

contract TestEIP712Verifier is Semver, EIP712Verifier {
    constructor(string memory name) Semver(1, 0, 0) EIP712Verifier(name, "1.0.0") {}

    function verifyAttest(DelegatedAttestationRequest memory request) external {
        _verifyAttest(request);
    }

    function verifyRevoke(DelegatedRevocationRequest memory request) external {
        _verifyRevoke(request);
    }
}
