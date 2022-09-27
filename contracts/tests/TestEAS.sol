// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { EAS } from "../EAS.sol";

import { IASRegistry } from "../IASRegistry.sol";
import { IEIP712Verifier } from "../IEIP712Verifier.sol";

contract TestEAS is EAS {
    uint32 private _currentTime = 1;

    constructor(IASRegistry aoRegistry, IEIP712Verifier eip712Verifier) EAS(aoRegistry, eip712Verifier) {}

    function setTime(uint32 newTime) external {
        _currentTime = newTime;
    }

    function currentTime() external view returns (uint32) {
        return _currentTime;
    }

    function _time() internal view virtual override returns (uint32) {
        return _currentTime;
    }
}
