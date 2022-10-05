// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { ISchemaResolver } from "./ISchemaResolver.sol";

/**
 * @title A base resolver contract
 */
abstract contract SchemaResolver is ISchemaResolver {
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
