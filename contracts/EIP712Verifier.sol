// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import { IEIP712Verifier } from "./IEIP712Verifier.sol";

// prettier-ignore
import {
    AttestationRequest,
    AttestationRequestData,
    DelegatedAttestationRequest,
    DelegatedRevocationRequest,
    RevocationRequest,
    RevocationRequestData
} from "./IEAS.sol";

import { EIP712Signature } from "./Types.sol";

/**
 * @title EIP712 typed signatures verifier for EAS delegated attestations.
 */
contract EIP712Verifier is IEIP712Verifier, EIP712 {
    error InvalidSignature();

    // The version of the contract.
    string public constant VERSION = "0.21";

    // The hash of the data type used to relay calls to the attest function. It's the value of
    // keccak256("Attest(bytes32 schema,address recipient,uint32 expirationTime,bool revocable,bytes32 refUUID,bytes data,uint256 nonce)").
    bytes32 private constant ATTEST_TYPEHASH = 0x790a6069414c6efe8e6aa1d915482176ee1e2e7d73c6f34d03df1813c5cb4ce9;

    // The hash of the data type used to relay calls to the revoke function. It's the value of
    // keccak256("Revoke(bytes32 schema,bytes32 uuid,uint256 nonce)").
    bytes32 private constant REVOKE_TYPEHASH = 0xf4d55e0bcbb226b4aaff947cf2f41ec6d6dcaecd1306fbe6f9b8746ad288b48e;

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
    function attest(DelegatedAttestationRequest calldata request) external {
        AttestationRequestData calldata data = request.data;
        EIP712Signature calldata signature = request.signature;

        uint256 nonce;
        unchecked {
            nonce = _nonces[request.attester]++;
        }

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ATTEST_TYPEHASH,
                    request.schema,
                    data.recipient,
                    data.expirationTime,
                    data.revocable,
                    data.refUUID,
                    keccak256(data.data),
                    nonce
                )
            )
        );

        if (ECDSA.recover(digest, signature.v, signature.r, signature.s) != request.attester) {
            revert InvalidSignature();
        }
    }

    /**
     * @inheritdoc IEIP712Verifier
     */
    function revoke(DelegatedRevocationRequest calldata request) external {
        RevocationRequestData calldata data = request.data;
        EIP712Signature calldata signature = request.signature;

        uint256 nonce;
        unchecked {
            nonce = _nonces[request.revoker]++;
        }

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(REVOKE_TYPEHASH, request.schema, data.uuid, nonce)));

        if (ECDSA.recover(digest, signature.v, signature.r, signature.s) != request.revoker) {
            revert InvalidSignature();
        }
    }
}
