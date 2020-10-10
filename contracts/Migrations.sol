// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

contract Migrations {
    address public owner = msg.sender;
    uint256 public lastCompletedMigration;

    modifier restricted() {
        require(msg.sender == owner, "ERR_INVALID_ACCESS");

        _;
    }

    function setCompleted(uint256 completed) public restricted {
        lastCompletedMigration = completed;
    }
}
