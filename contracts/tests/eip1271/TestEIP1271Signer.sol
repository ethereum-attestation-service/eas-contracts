// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import { IERC1271 } from "@openzeppelin/contracts/interfaces/IERC1271.sol";

import { EIP1271Verifier } from "../../eip1271/EIP1271Verifier.sol";

import { Signature, InvalidSignature } from "../../Common.sol";

contract TestEIP1271Signer is IERC1271 {
    bytes4 private constant EIP1271_INVALID_MAGIC_VALUE = 0xffffffff;

    mapping(bytes32 hash => bytes signature) private _validSignatures;

    function mockSignature(bytes32 hash, bytes calldata signature) external {
        _validSignatures[hash] = signature;
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4 magicValue) {
        bytes memory storedSignature = _validSignatures[hash];
        if (storedSignature.length == signature.length && keccak256(storedSignature) == keccak256(signature)) {
            return IERC1271.isValidSignature.selector;
        }

        return EIP1271_INVALID_MAGIC_VALUE;
    }
}
