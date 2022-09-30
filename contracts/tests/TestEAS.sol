// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { EAS } from "../EAS.sol";

import { IASRegistry } from "../IASRegistry.sol";
import { IEIP712Verifier } from "../IEIP712Verifier.sol";

contract TestEAS is EAS {
    uint32 private INITIAL_TIME = 0;

    uint32 private _currentTime = INITIAL_TIME;

    constructor(IASRegistry aoRegistry, IEIP712Verifier eip712Verifier) EAS(aoRegistry, eip712Verifier) {}

    function setTime(uint32 newTime) external {
        _currentTime = newTime;
    }

    function getTime() external view returns (uint32) {
        return _time();
    }

    function _time() internal view virtual override returns (uint32) {
        return _currentTime == INITIAL_TIME ? super._time() : _currentTime;
    }
}
