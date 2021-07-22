// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "./IEIP712Verifier.sol";

/**
 * @title EIP712 typed signatures verifier for EAS delegated attestations.
 */
contract EIP712Verifier is IEIP712Verifier {
    string public constant VERSION = "0.4";

    // EIP712 domain separator, making signatures from different domains incompatible.
    bytes32 public immutable DOMAIN_SEPARATOR; // solhint-disable-line var-name-mixedcase

    // The hash of the data type used to relay calls to the attest function. It's the value of
    // keccak256("Attest(address recipient,uint256 schema,uint256 expirationTime,bytes32 refUUID,bytes data,uint256 nonce)").
    bytes32 public constant ATTEST_TYPEHASH = 0x531428c5a0280af75a716171c6425f003876d506658954796652160838d6dbb9;

    // The hash of the data type used to relay calls to the revoke function. It's the value of
    // keccak256("Revoke(bytes32 uuid,uint256 nonce)").
    bytes32 public constant REVOKE_TYPEHASH = 0xbae0931f3a99efd1b97c2f5b6b6e79d16418246b5055d64757e16de5ad11a8ab;

    // Replay protection nonces.
    mapping(address => uint256) private _nonces;

    /**
     * @dev Creates a new EIP712Verifier instance.
     */
    constructor() {
        uint256 chainId;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            chainId := chainid()
        }

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("EAS")),
                keccak256(bytes(VERSION)),
                chainId,
                address(this)
            )
        );
    }

    /**
     * @inheritdoc IEIP712Verifier
     */
    function getNonce(address account) external view override returns (uint256) {
        return _nonces[account];
    }

    /**
     * @inheritdoc IEIP712Verifier
     */
    function attest(
        address recipient,
        bytes32 schema,
        uint256 expirationTime,
        bytes32 refUUID,
        bytes calldata data,
        address attester,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        ATTEST_TYPEHASH,
                        recipient,
                        schema,
                        expirationTime,
                        refUUID,
                        keccak256(data),
                        _nonces[attester]++
                    )
                )
            )
        );

        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == attester, "ERR_INVALID_SIGNATURE");
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
    ) external override {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(REVOKE_TYPEHASH, uuid, _nonces[attester]++))
            )
        );

        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == attester, "ERR_INVALID_SIGNATURE");
    }
}
