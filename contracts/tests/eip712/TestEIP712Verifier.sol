// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import { EIP712Verifier } from "../../eip712/EIP712Verifier.sol";
import { DelegatedAttestationRequest, DelegatedRevocationRequest } from "../../IEAS.sol";

contract TestEIP712Verifier is EIP712Verifier {
    string public constant VERSION = "0.28";

    constructor(string memory name) EIP712Verifier(name, VERSION) {}

    function verifyAttest(DelegatedAttestationRequest memory request) external {
        _verifyAttest(request);
    }

    function verifyRevoke(DelegatedRevocationRequest memory request) external {
        _verifyRevoke(request);
    }
}
