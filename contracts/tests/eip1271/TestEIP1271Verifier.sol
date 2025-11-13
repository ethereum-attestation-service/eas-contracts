// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import { EIP1271Verifier } from "../../eip1271/EIP1271Verifier.sol";
import {
    DelegatedAttestationRequest,
    DelegatedRevocationRequest,
    ERC1271DelegatedAttestationRequest,
    ERC1271DelegatedRevocationRequest
} from "../../IEAS.sol";
import { Semver } from "../../Semver.sol";

contract TestEIP1271Verifier is Semver, EIP1271Verifier {
    constructor(string memory name) Semver(1, 4, 0) EIP1271Verifier(name, "1.4.0") {}

    function verifyAttest(DelegatedAttestationRequest memory request) external {
        _verifyAttest(request);
    }

    function verifyRevoke(DelegatedRevocationRequest memory request) external {
        _verifyRevoke(request);
    }

    function verifyERC1271Attest(ERC1271DelegatedAttestationRequest memory request) external {
        _verifyERC1271Attest(request);
    }

    function verifyERC1271Revoke(ERC1271DelegatedRevocationRequest memory request) external {
        _verifyERC1271Revoke(request);
    }
}
