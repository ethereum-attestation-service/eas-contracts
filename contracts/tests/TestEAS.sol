// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../EAS.sol";

contract TestEAS is EAS {
    bytes32 public lastUUID;

    constructor(AORegistry _aoRegistry) public EAS(_aoRegistry) {}

    function testAttest(
        address _recipient,
        uint256 _ao,
        uint256 _expirationTime,
        bytes calldata _data
    ) public payable returns (bytes32) {
        lastUUID = super.attest(_recipient, _ao, _expirationTime, _data);

        return lastUUID;
    }
}
