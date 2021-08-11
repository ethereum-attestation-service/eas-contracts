// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "../../ASResolver.sol";
import "../../EAS.sol";

/**
 * @title A sample AS resolver that checks whether an attestations attest to an existing attestation.
 */
contract TestASAttestationResolver is ASResolver {
    EAS private immutable _eas;

    constructor(EAS eas) {
        _eas = eas;
    }

    function resolve(
        address, /* recipient */
        bytes calldata, /* schema */
        bytes calldata data,
        uint256, /* expirationTime */
        address /* msgSender */
    ) external payable virtual override returns (bool) {
        return _eas.isAttestationValid(_toBytes32(data, 0));
    }

    function _toBytes32(bytes memory data, uint256 start) private pure returns (bytes32) {
        require(start + 32 >= start, "ERR_OVERFLOW");
        require(data.length >= start + 32, "ERR_OUT_OF_BOUNDS");
        bytes32 tempBytes32;

        // solhint-disable-next-line no-inline-assembly
        assembly {
            tempBytes32 := mload(add(add(data, 0x20), start))
        }

        return tempBytes32;
    }
}
