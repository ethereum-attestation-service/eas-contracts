// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "./IASResolver.sol";

/**
 * @title A base resolver contract
 */
abstract contract ASResolver is IASResolver {
    function isPayable() public pure virtual override returns (bool) {
        return false;
    }

    receive() external payable virtual {
        require(isPayable(), "ERR_NOT_PAYABLE");
    }
}
