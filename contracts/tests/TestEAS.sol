// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import { EAS } from "../EAS.sol";

import { ISchemaRegistry } from "../ISchemaRegistry.sol";

contract TestEAS is EAS {
    uint64 private constant INITIAL_TIME = 0;

    uint64 private _currentTime = INITIAL_TIME;

    constructor(ISchemaRegistry registry) EAS(registry) {}

    function setTime(uint64 newTime) external {
        _currentTime = newTime;
    }

    function getTime() external view returns (uint64) {
        return _time();
    }

    function _time() internal view override returns (uint64) {
        return _currentTime == INITIAL_TIME ? super._time() : _currentTime;
    }
}
