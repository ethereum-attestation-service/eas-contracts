// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../EAS.sol";

contract TestEAS is EAS {
    bytes32 public lastUUID;

    constructor(AORegistry aoRegistry) public EAS(aoRegistry) {}

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
}
