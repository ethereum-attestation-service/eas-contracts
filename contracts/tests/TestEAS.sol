// SPDX-License-Identifier: MIT

pragma solidity 0.7.4;

import "../EAS.sol";

contract TestEAS is EAS {
    bytes32 public lastUUID;

    constructor(AORegistry aoRegistry, EIP712Verifier eip712Verifier) EAS(aoRegistry, eip712Verifier) {}

    function testAttest(
        address recipient,
        uint256 ao,
        uint256 expirationTime,
        bytes32 refUUID,
        bytes calldata data
    ) public payable returns (bytes32) {
        lastUUID = super.attest(recipient, ao, expirationTime, refUUID, data);

        return lastUUID;
    }

    function testAttestByProxy(
        address recipient,
        uint256 ao,
        uint256 expirationTime,
        bytes32 refUUID,
        bytes calldata data,
        address attester,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public payable returns (bytes32) {
        lastUUID = super.attestByProxy(recipient, ao, expirationTime, refUUID, data, attester, v, r, s);

        return lastUUID;
    }
}
