import { expect } from 'chai';
import { encodeBytes32String, hexlify, keccak256, Signer, solidityPacked, toUtf8Bytes } from 'ethers';
import { ethers } from 'hardhat';
import Contracts, { TestEIP1271Signer } from '../../components/Contracts';
import { TestEIP1271Verifier } from '../../typechain-types';
import { NO_EXPIRATION, ZERO_BYTES, ZERO_BYTES32 } from '../../utils/Constants';
import { ATTEST_TYPED_SIGNATURE, EIP712Utils, REVOKE_TYPED_SIGNATURE } from '../helpers/EIP712Utils';
import { duration, latest } from '../helpers/Time';
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
          value: bigint;
        }

        const schema = ZERO_BYTES32;
        const deadline = NO_EXPIRATION;
        let attestationRequest: AttestationRequestData;

        beforeEach(async () => {
          attestationRequest = {
            recipient: await recipient.getAddress(),
            expirationTime: NO_EXPIRATION,
            revocable: true,
            refUID: ZERO_BYTES32,
            data: ZERO_BYTES,
            value: 1000n
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
                attestationRequest.value,
                nonce,
                deadline
              );

            case SignerType.Contract: {
              const hash = await eip712Utils.hashDelegatedAttestation(
                await signer.getAddress(),
                schema,
                attestationRequest.recipient,
                attestationRequest.expirationTime,
                attestationRequest.revocable,
                attestationRequest.refUID,
                attestationRequest.data,
                attestationRequest.value,
                nonce,
                deadline
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
                attester: await signer.getAddress(),
                deadline
              })
            ).not.to.be.reverted;
          }
        });

        it('should revert when verifying delegated attestation request with an expired deadline', async () => {
          const signature = await signDelegatedAttestation(signer, attestationRequest);

          await expect(
            verifier.verifyAttest({
              schema,
              data: attestationRequest,
              signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
              attester: await signer.getAddress(),
              deadline: (await latest()) - duration.hours(1n)
            })
          ).to.be.revertedWithCustomError(verifier, 'DeadlineExpired');
        });

        it('should revert when verifying delegated attestation request with a wrong signature', async () => {
          const signature = await signDelegatedAttestation(signer, attestationRequest);

          await expect(
            verifier.verifyAttest({
              schema,
              data: attestationRequest,
              signature: { v: signature.v, r: encodeBytes32String('BAD'), s: hexlify(signature.s) },
              attester: await signer.getAddress(),
              deadline
            })
          ).to.be.revertedWithCustomError(verifier, 'InvalidSignature');

          await expect(
            verifier.verifyAttest({
              schema,
              data: attestationRequest,
              signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
              attester: await wrongSigner.getAddress(),
              deadline
            })
          ).to.be.revertedWithCustomError(verifier, 'InvalidSignature');
        });
      });

      describe('verify revoke', () => {
        const schema = ZERO_BYTES32;
        const deadline = NO_EXPIRATION;

        interface RevocationRequestData {
          uid: string;
          value: bigint;
        }

        const revocationRequest: RevocationRequestData = {
          uid: ZERO_BYTES32,
          value: 1000n
        };

        const signDelegatedRevocation = async (
          signer: Signer | TestEIP1271Signer,
          revocationRequest: RevocationRequestData
        ) => {
          const nonce = await verifier.getNonce(await signer.getAddress());

          switch (signerType) {
            case SignerType.EOA:
              return eip712Utils.signDelegatedRevocation(
                signer as Signer,
                schema,
                revocationRequest.uid,
                revocationRequest.value,
                nonce,
                deadline
              );

            case SignerType.Contract: {
              const hash = await eip712Utils.hashDelegatedRevocation(
                await signer.getAddress(),
                schema,
                revocationRequest.uid,
                revocationRequest.value,
                nonce,
                deadline
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

        it('should verify delegated revocation request', async () => {
          for (let i = 0; i < 3; ++i) {
            const signature = await signDelegatedRevocation(signer, revocationRequest);

            await expect(
              verifier.verifyRevoke({
                schema,
                data: revocationRequest,
                signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
                revoker: await signer.getAddress(),
                deadline
              })
            ).not.to.be.reverted;
          }
        });

        it('should revert when verifying delegated attestation request with an expired deadline', async () => {
          const signature = await signDelegatedRevocation(signer, revocationRequest);

          await expect(
            verifier.verifyRevoke({
              schema,
              data: revocationRequest,
              signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
              revoker: await signer.getAddress(),
              deadline: (await latest()) - duration.hours(1n)
            })
          ).to.be.revertedWithCustomError(verifier, 'DeadlineExpired');
        });

        it('should revert when verifying delegated revocation request with a wrong signature', async () => {
          const signature = await signDelegatedRevocation(signer, revocationRequest);

          await expect(
            verifier.verifyRevoke({
              schema,
              data: revocationRequest,
              signature: { v: signature.v, r: encodeBytes32String('BAD'), s: hexlify(signature.s) },
              revoker: await signer.getAddress(),
              deadline
            })
          ).to.be.revertedWithCustomError(verifier, 'InvalidSignature');

          await expect(
            verifier.verifyRevoke({
              schema,
              data: revocationRequest,
              signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
              revoker: await wrongSigner.getAddress(),
              deadline
            })
          ).to.be.revertedWithCustomError(verifier, 'InvalidSignature');
        });
      });

      describe('increasing nonces', () => {
        let user: Signer;

        before(() => {
          [user] = accounts;
        });

        const expectNonceIncrease = async (newNonce: bigint) => {
          const oldNonce = await verifier.getNonce(await user.getAddress());
          const res = await verifier.connect(user).increaseNonce(newNonce);

          await expect(res).to.emit(verifier, 'NonceIncreased').withArgs(oldNonce, newNonce);

          expect(await verifier.getNonce(await user.getAddress())).to.equal(newNonce);
        };

        it('should allow users to increase their nonces', async () => {
          await expectNonceIncrease(100n);
          await expectNonceIncrease(201n);
        });

        it('should revert when users attempt to decrease/keep their nonces', async () => {
          // Increase the current nonce such that it doesn't start at 0.
          const nonce = 100n;
          await verifier.connect(user).increaseNonce(nonce);

          await expect(verifier.connect(user).increaseNonce(nonce)).to.be.revertedWithCustomError(
            verifier,
            'InvalidNonce'
          );
          await expect(verifier.connect(user).increaseNonce(nonce - 5n)).to.be.revertedWithCustomError(
            verifier,
            'InvalidNonce'
          );
        });
      });
    });
  }
});
