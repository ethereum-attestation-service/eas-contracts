// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import { IEIP712Verifier } from "./IEIP712Verifier.sol";

/**
 * @title EIP712 typed signatures verifier for EAS delegated attestations.
 */
contract EIP712Verifier is IEIP712Verifier, EIP712 {
    error InvalidSignature();

    // The version of the contract.
    string public constant VERSION = "0.11";

    // The hash of the data type used to relay calls to the attest function. It's the value of
    // keccak256("Attest(address recipient,bytes32 schema,uint32 expirationTime,bytes32 refUUID,bytes data,uint256 nonce)").
    bytes32 private constant ATTEST_TYPEHASH = 0xfd4dc6e2693a62bd64d4a19b3cff766012b6aed3bb661a4b20ffcf8236431150;

    // The hash of the data type used to relay calls to the revoke function. It's the value of
    // keccak256("Revoke(bytes32 uuid,uint256 nonce)").
    bytes32 private constant REVOKE_TYPEHASH = 0xbae0931f3a99efd1b97c2f5b6b6e79d16418246b5055d64757e16de5ad11a8ab;

    // Replay protection nonces.
    mapping(address => uint256) private _nonces;

    /**
     * @dev Creates a new EIP712Verifier instance.
     */
    constructor() EIP712("EAS", VERSION) {}

    /**
     * @inheritdoc IEIP712Verifier
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @inheritdoc IEIP712Verifier
     */
    function getNonce(address account) external view returns (uint256) {
        return _nonces[account];
    }

    /**
     * Returns the EIP712 type hash for the attest function.
     */
    function getAttestTypeHash() external pure returns (bytes32) {
        return ATTEST_TYPEHASH;
    }

    /**
     * Returns the EIP712 type hash for the revoke function.
     */
    function getRevokeTypeHash() external pure returns (bytes32) {
        return REVOKE_TYPEHASH;
    }

    /**
     * @inheritdoc IEIP712Verifier
     */
    function attest(
        address recipient,
        bytes32 schema,
        uint32 expirationTime,
        bytes32 refUUID,
        bytes calldata data,
        address attester,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        uint256 nonce;
        unchecked {
            nonce = _nonces[attester]++;
        }

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(ATTEST_TYPEHASH, recipient, schema, expirationTime, refUUID, keccak256(data), nonce))
        );

        if (ECDSA.recover(digest, v, r, s) != attester) {
            revert InvalidSignature();
        }
    }

    /**
     * @inheritdoc IEIP712Verifier
     */
    function revoke(
        bytes32 uuid,
        address attester,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        uint256 nonce;
        unchecked {
            nonce = _nonces[attester]++;
        }

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(REVOKE_TYPEHASH, uuid, nonce)));

        if (ECDSA.recover(digest, v, r, s) != attester) {
            revert InvalidSignature();
        }
    }
}
