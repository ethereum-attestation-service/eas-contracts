// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../../IAOVerifier.sol";

contract TestAORecipientVerifier is IAOVerifier {
    address public targetRecipient;

    constructor(address _targetRecipient) public {
        targetRecipient = _targetRecipient;
    }

    function verify(
        address _recipient,
        bytes calldata, /* _schema */
        bytes calldata, /* _data */
        uint256, /* _expirationTime */
        address, /* _msgSender */
        uint256 /* _msgValue */
    ) public virtual override view returns (bool) {
        return _recipient == targetRecipient;
    }
}
