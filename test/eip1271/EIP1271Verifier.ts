import { expect } from 'chai';
import { encodeBytes32String, hexlify, keccak256, Signer, solidityPacked, toUtf8Bytes } from 'ethers';
import { ethers } from 'hardhat';
import Contracts, { TestEIP1271Signer } from '../../components/Contracts';
import { TestEIP1271Verifier } from '../../typechain-types';
import { NO_EXPIRATION, ZERO_BYTES, ZERO_BYTES32 } from '../../utils/Constants';
import { ATTEST_TYPED_SIGNATURE, EIP712Utils, REVOKE_TYPED_SIGNATURE } from '../helpers/EIP712Utils';
import { latest } from '../helpers/Time';
import { createWallet } from '../helpers/Wallet';

const EIP712_NAME = 'EAS';

describe('EIP1271Verifier', () => {
  let accounts: Signer[];
  let recipient: Signer;

  let verifier: TestEIP1271Verifier;
  let eip712Utils: EIP712Utils;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    verifier = await Contracts.TestEIP1271Verifier.deploy(EIP712_NAME);

    eip712Utils = await EIP712Utils.fromVerifier(verifier);
  });

  describe('construction', () => {
    it('should be properly initialized', async () => {
      expect(await verifier.getDomainSeparator()).to.equal(eip712Utils.getDomainSeparator(EIP712_NAME));
      expect(await verifier.getAttestTypeHash()).to.equal(keccak256(toUtf8Bytes(ATTEST_TYPED_SIGNATURE)));
      expect(await verifier.getRevokeTypeHash()).to.equal(keccak256(toUtf8Bytes(REVOKE_TYPED_SIGNATURE)));
      expect(await verifier.getName()).to.equal(EIP712_NAME);
    });
  });

  enum SignerType {
    EOA = 'eoa',
    Contract = 'contract'
  }

  for (const signerType of [SignerType.EOA, SignerType.Contract]) {
    context(`by a ${signerType} signer`, () => {
      let signer: Signer | TestEIP1271Signer;
      let wrongSigner: Signer | TestEIP1271Signer;

      beforeEach(async () => {
        switch (signerType) {
          case SignerType.EOA:
            signer = await createWallet();
            wrongSigner = await createWallet();

            break;

          case SignerType.Contract:
            signer = await Contracts.TestEIP1271Signer.deploy();
            wrongSigner = await Contracts.TestEIP1271Signer.deploy();

            break;
        }
      });

      describe('verify attest', () => {
        interface AttestationRequestData {
          recipient: string;
          expirationTime: bigint;
          revocable: boolean;
          refUID: string;
          data: string;
          value: number;
        }

        const schema = ZERO_BYTES32;
        let attestationRequest: AttestationRequestData;

        beforeEach(async () => {
          attestationRequest = {
            recipient: await recipient.getAddress(),
            expirationTime: NO_EXPIRATION,
            revocable: true,
            refUID: ZERO_BYTES32,
            data: ZERO_BYTES,
            value: 1000
          };
        });

        const signDelegatedAttestation = async (
          signer: Signer | TestEIP1271Signer,
          attestationRequest: AttestationRequestData
        ) => {
          const nonce = await verifier.getNonce(await signer.getAddress());

          switch (signerType) {
            case SignerType.EOA:
              return eip712Utils.signDelegatedAttestation(
                signer as Signer,
                schema,
                attestationRequest.recipient,
                attestationRequest.expirationTime,
                attestationRequest.revocable,
                attestationRequest.refUID,
                attestationRequest.data,
                nonce
              );

            case SignerType.Contract: {
              const hash = await eip712Utils.hashDelegatedAttestation(
                schema,
                attestationRequest.recipient,
                attestationRequest.expirationTime,
                attestationRequest.revocable,
                attestationRequest.refUID,
                attestationRequest.data,
                nonce
              );

              // Just a dummy signature
              const signature = { s: hexlify(keccak256(`${hash}${await latest()}`)), r: hexlify(hash), v: 27 };
              await (signer as TestEIP1271Signer).mockSignature(
                hash,
                solidityPacked(['bytes32', 'bytes32', 'uint8'], [signature.r, signature.s, signature.v])
              );

              return signature;
            }
          }
        };

        it('should verify delegated attestation request', async () => {
          for (let i = 0; i < 3; ++i) {
            const signature = await signDelegatedAttestation(signer, attestationRequest);

            await expect(
              verifier.verifyAttest({
                schema,
                data: attestationRequest,
                signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
                attester: await signer.getAddress()
              })
            ).not.to.be.reverted;
          }
        });

        it('should revert when verifying delegated attestation request with a wrong signature', async () => {
          const signature = await signDelegatedAttestation(signer, attestationRequest);

          await expect(
            verifier.verifyAttest({
              schema,
              data: attestationRequest,
              signature: { v: signature.v, r: encodeBytes32String('BAD'), s: hexlify(signature.s) },
              attester: await signer.getAddress()
            })
          ).to.be.revertedWithCustomError(verifier, 'InvalidSignature');

          await expect(
            verifier.verifyAttest({
              schema,
              data: attestationRequest,
              signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
              attester: await wrongSigner.getAddress()
            })
          ).to.be.revertedWithCustomError(verifier, 'InvalidSignature');
        });
      });

      describe('verify revoke', () => {
        const schema = ZERO_BYTES32;

        interface RevocationRequestData {
          uid: string;
          value: number;
        }

        const revocationRequest: RevocationRequestData = {
          uid: ZERO_BYTES32,
          value: 1000
        };

        const signDelegatedRevocation = async (
          signer: Signer | TestEIP1271Signer,
          revocationRequest: RevocationRequestData
        ) => {
          const nonce = await verifier.getNonce(await signer.getAddress());

          switch (signerType) {
            case SignerType.EOA:
              return eip712Utils.signDelegatedRevocation(signer as Signer, schema, revocationRequest.uid, nonce);

            case SignerType.Contract: {
              const hash = await eip712Utils.hashDelegatedRevocation(schema, revocationRequest.uid, nonce);

              // Just a dummy signature
              const signature = { s: hexlify(keccak256(`${hash}${await latest()}`)), r: hexlify(hash), v: 27 };
              await (signer as TestEIP1271Signer).mockSignature(
                hash,
                solidityPacked(['bytes32', 'bytes32', 'uint8'], [signature.r, signature.s, signature.v])
              );

              return signature;
            }
          }
        };

        it('should verify delegated revocation request', async () => {
          for (let i = 0; i < 3; ++i) {
            const signature = await signDelegatedRevocation(signer, revocationRequest);

            await expect(
              verifier.verifyRevoke({
                schema,
                data: revocationRequest,
                signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
                revoker: await signer.getAddress()
              })
            ).not.to.be.reverted;
          }
        });

        it('should revert when verifying delegated revocation request with a wrong signature', async () => {
          const signature = await signDelegatedRevocation(signer, revocationRequest);

          await expect(
            verifier.verifyRevoke({
              schema,
              data: revocationRequest,
              signature: { v: signature.v, r: encodeBytes32String('BAD'), s: hexlify(signature.s) },
              revoker: await signer.getAddress()
            })
          ).to.be.revertedWithCustomError(verifier, 'InvalidSignature');

          await expect(
            verifier.verifyRevoke({
              schema,
              data: revocationRequest,
              signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
              revoker: await wrongSigner.getAddress()
            })
          ).to.be.revertedWithCustomError(verifier, 'InvalidSignature');
        });
      });
    });
  }
});
