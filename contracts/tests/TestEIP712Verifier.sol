// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { EIP712Verifier } from "../EIP712Verifier.sol";
import { DelegatedAttestationRequest, DelegatedRevocationRequest } from "../IEAS.sol";

contract TestEIP712Verifier is EIP712Verifier {
    string public constant VERSION = "0.24";

    constructor() EIP712Verifier(VERSION) {}

    function verifyAttest(DelegatedAttestationRequest memory request) external {
        _verifyAttest(request);
    }

    function verifyRevoke(DelegatedRevocationRequest memory request) external {
        _verifyRevoke(request);
    }
}
