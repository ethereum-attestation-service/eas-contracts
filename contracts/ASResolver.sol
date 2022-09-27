// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { IASResolver } from "./IASResolver.sol";

/**
 * @title A base resolver contract
 */
abstract contract ASResolver is IASResolver {
    error NotPayable();

    function isPayable() public pure virtual returns (bool) {
        return false;
    }

    receive() external payable virtual {
        if (!isPayable()) {
            revert NotPayable();
        }
    }
}
