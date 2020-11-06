// SPDX-License-Identifier: MIT

pragma solidity 0.7.4;

contract Migrations {
    address public _owner = msg.sender;
    uint256 public _lastCompletedMigration;

    modifier restricted() {
        require(msg.sender == _owner, "ERR_INVALID_ACCESS");

        _;
    }

    function setCompleted(uint256 completed) public restricted {
        _lastCompletedMigration = completed;
    }
}
