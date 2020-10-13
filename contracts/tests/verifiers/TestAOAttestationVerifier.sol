// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../../IAOVerifier.sol";
import "../../EAS.sol";

/// @title A sample AO verifier that checks whether an attestations attest to an existing attestation.
contract TestAOAttestationVerifier is IAOVerifier {
    EAS public eas;

    constructor(EAS _eas) public {
        eas = _eas;
    }

    function verify(
        address, /* _recipient */
        bytes calldata, /* _schema */
        bytes calldata _data,
        uint256, /* _expirationTime */
        address, /* _msgSender */
        uint256 /* _msgValue */
    ) public virtual override view returns (bool) {
        return eas.isAttestationValid(toBytes32(_data, 0));
    }

    function toBytes32(bytes memory _bytes, uint256 _start) private pure returns (bytes32) {
        require(_start + 32 >= _start, "ERR_OVERFLOW");
        require(_bytes.length >= _start + 32, "ERR_OUT_OF_BOUNDS");
        bytes32 tempBytes32;

        // solhint-disable-next-line no-inline-assembly
        assembly {
            tempBytes32 := mload(add(add(_bytes, 0x20), _start))
        }

        return tempBytes32;
    }
}
