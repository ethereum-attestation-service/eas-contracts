import { expect } from 'chai';
import { encodeBytes32String, hexlify, keccak256, Signer, toUtf8Bytes } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../../../components/Contracts';
import { SchemaRegistry, TestEAS, TestEIP712Proxy } from '../../../typechain-types';
import { NO_EXPIRATION, ZERO_ADDRESS, ZERO_BYTES, ZERO_BYTES32 } from '../../../utils/Constants';
import { getSchemaUID } from '../../../utils/EAS';
import { expectAttestation, SignatureType } from '../../helpers/EAS';
import {
  ATTEST_PROXY_TYPED_SIGNATURE,
  EIP712ProxyUtils,
  REVOKE_PROXY_TYPED_SIGNATURE
} from '../../helpers/EIP712ProxyUtils';
import { latest } from '../../helpers/Time';
import { createWallet } from '../../helpers/Wallet';

const EIP712_PROXY_NAME = 'EIP712Proxy';

describe('EIP712Proxy', () => {
  let accounts: Signer[];
  let sender: Signer;
  let sender2: Signer;
  let recipient: Signer;

  let registry: SchemaRegistry;
  let eas: TestEAS;
  let proxy: TestEIP712Proxy;
  let eip712ProxyUtils: EIP712ProxyUtils;

  const schema = 'bool like';
  const schemaId = getSchemaUID(schema, ZERO_ADDRESS, true);
  const deadline = NO_EXPIRATION;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();
    sender2 = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(await registry.getAddress());

    await eas.setTime(await latest());

    proxy = await Contracts.TestEIP712Proxy.deploy(await eas.getAddress(), EIP712_PROXY_NAME);

    eip712ProxyUtils = await EIP712ProxyUtils.fromProxy(proxy);

    await registry.register(schema, ZERO_ADDRESS, true);
  });

  describe('construction', () => {
    it('should revert when initialized with an empty schema registry', async () => {
      await expect(Contracts.TestEIP712Proxy.deploy(ZERO_ADDRESS, EIP712_PROXY_NAME)).to.be.revertedWithCustomError(
        proxy,
        'InvalidEAS'
      );
    });

    it('should be properly initialized', async () => {
      expect(await proxy.version()).to.equal('1.1.0');

      expect(await proxy.getEAS()).to.equal(await eas.getAddress());
      expect(await proxy.getDomainSeparator()).to.equal(eip712ProxyUtils.getDomainSeparator(EIP712_PROXY_NAME));
      expect(await proxy.getAttestTypeHash()).to.equal(keccak256(toUtf8Bytes(ATTEST_PROXY_TYPED_SIGNATURE)));
      expect(await proxy.getRevokeTypeHash()).to.equal(keccak256(toUtf8Bytes(REVOKE_PROXY_TYPED_SIGNATURE)));
      expect(await proxy.getName()).to.equal(EIP712_PROXY_NAME);
    });
  });

  describe('verify attest', () => {
    it('should verify delegated attestation request', async () => {
      const attestationRequest = {
        recipient: await recipient.getAddress(),
        expirationTime: NO_EXPIRATION,
        revocable: true,
        refUID: ZERO_BYTES32,
        data: ZERO_BYTES,
        value: 1000
      };

      const signature = await eip712ProxyUtils.signDelegatedProxyAttestation(
        sender,
        schemaId,
        attestationRequest.recipient,
        attestationRequest.expirationTime,
        attestationRequest.revocable,
        attestationRequest.refUID,
        attestationRequest.data,
        deadline
      );

      await expect(
        proxy.verifyAttest({
          schema: schemaId,
          data: attestationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          attester: await sender.getAddress(),
          deadline
        })
      ).not.to.be.reverted;
    });

    it('should revert when verifying delegated attestation request with a wrong signature', async () => {
      const attestationRequest = {
        recipient: await recipient.getAddress(),
        expirationTime: NO_EXPIRATION,
        revocable: true,
        refUID: ZERO_BYTES32,
        data: ZERO_BYTES,
        value: 1000
      };

      const signature = await eip712ProxyUtils.signDelegatedProxyAttestation(
        sender,
        schemaId,
        attestationRequest.recipient,
        attestationRequest.expirationTime,
        attestationRequest.revocable,
        attestationRequest.refUID,
        attestationRequest.data,
        deadline
      );

      await expect(
        proxy.verifyAttest({
          schema: schemaId,
          data: attestationRequest,
          signature: { v: signature.v, r: encodeBytes32String('BAD'), s: hexlify(signature.s) },
          attester: await sender.getAddress(),
          deadline
        })
      ).to.be.revertedWithCustomError(proxy, 'InvalidSignature');

      await expect(
        proxy.verifyAttest({
          schema: schemaId,
          data: attestationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          attester: await sender2.getAddress(),
          deadline
        })
      ).to.be.revertedWithCustomError(proxy, 'InvalidSignature');
    });

    it('should revert when verifying delegated attestation request with a used signature', async () => {
      const attestationRequest = {
        recipient: await recipient.getAddress(),
        expirationTime: NO_EXPIRATION,
        revocable: true,
        refUID: ZERO_BYTES32,
        data: ZERO_BYTES,
        value: 1000
      };

      const signature = await eip712ProxyUtils.signDelegatedProxyAttestation(
        sender,
        schemaId,
        attestationRequest.recipient,
        attestationRequest.expirationTime,
        attestationRequest.revocable,
        attestationRequest.refUID,
        attestationRequest.data,
        deadline
      );

      await expect(
        proxy.verifyAttest({
          schema: schemaId,
          data: attestationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          attester: await sender.getAddress(),
          deadline
        })
      ).not.to.be.reverted;

      await expect(
        proxy.verifyAttest({
          schema: schemaId,
          data: attestationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          attester: await sender.getAddress(),
          deadline
        })
      ).to.be.revertedWithCustomError(proxy, 'UsedSignature');
    });

    it('should revert when verifying delegated attestation request with an expired deadline', async () => {
      const attestationRequest = {
        recipient: await recipient.getAddress(),
        expirationTime: NO_EXPIRATION,
        revocable: true,
        refUID: ZERO_BYTES32,
        data: ZERO_BYTES,
        value: 1000
      };

      const expiredDeadline = 1n;
      const signature = await eip712ProxyUtils.signDelegatedProxyAttestation(
        sender,
        schemaId,
        attestationRequest.recipient,
        attestationRequest.expirationTime,
        attestationRequest.revocable,
        attestationRequest.refUID,
        attestationRequest.data,
        expiredDeadline
      );

      await expect(
        proxy.verifyAttest({
          schema: schemaId,
          data: attestationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          attester: await sender.getAddress(),
          deadline: expiredDeadline
        })
      ).to.be.revertedWithCustomError(proxy, 'DeadlineExpired');
    });

    it('should revert when multi delegation attesting with inconsistent input lengths', async () => {
      await expect(
        proxy.multiAttestByDelegation([
          {
            schema: schemaId,
            data: [
              {
                recipient: await recipient.getAddress(),
                expirationTime: NO_EXPIRATION,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: ZERO_BYTES32,
                value: 0
              },
              {
                recipient: await recipient.getAddress(),
                expirationTime: NO_EXPIRATION,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: ZERO_BYTES32,
                value: 0
              }
            ],
            signatures: [
              {
                v: 28,
                r: encodeBytes32String('BAD'),
                s: encodeBytes32String('BAD')
              }
            ],
            attester: await sender.getAddress(),
            deadline: NO_EXPIRATION
          }
        ])
      ).to.be.revertedWithCustomError(eas, 'InvalidLength');

      await expect(
        proxy.multiAttestByDelegation([
          {
            schema: schemaId,
            data: [],
            signatures: [
              {
                v: 28,
                r: encodeBytes32String('BAD'),
                s: encodeBytes32String('BAD')
              }
            ],
            attester: await sender.getAddress(),
            deadline: NO_EXPIRATION
          }
        ])
      ).to.be.revertedWithCustomError(eas, 'InvalidLength');

      await expect(
        proxy.multiAttestByDelegation([
          {
            schema: schemaId,
            data: [
              {
                recipient: await recipient.getAddress(),
                expirationTime: NO_EXPIRATION,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: ZERO_BYTES32,
                value: 0
              }
            ],
            signatures: [
              {
                v: 28,
                r: encodeBytes32String('1'),
                s: encodeBytes32String('2')
              },
              {
                v: 28,
                r: encodeBytes32String('3'),
                s: encodeBytes32String('4')
              }
            ],
            attester: await sender.getAddress(),
            deadline: NO_EXPIRATION
          }
        ])
      ).to.be.revertedWithCustomError(eas, 'InvalidLength');

      await expect(
        proxy.multiAttestByDelegation([
          {
            schema: schemaId,
            data: [
              {
                recipient: await recipient.getAddress(),
                expirationTime: NO_EXPIRATION,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: ZERO_BYTES32,
                value: 0
              },
              {
                recipient: await recipient.getAddress(),
                expirationTime: NO_EXPIRATION,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: ZERO_BYTES32,
                value: 0
              }
            ],
            signatures: [],
            attester: await sender.getAddress(),
            deadline: NO_EXPIRATION
          }
        ])
      ).to.be.revertedWithCustomError(eas, 'InvalidLength');
    });
  });

  describe('verify revoke', () => {
    let uid: string;

    beforeEach(async () => {
      ({ uid } = await expectAttestation(
        { eas, eip712ProxyUtils },
        schemaId,
        { recipient: ZERO_ADDRESS, expirationTime: NO_EXPIRATION, data: ZERO_BYTES },
        { signatureType: SignatureType.DelegatedProxy, from: sender }
      ));
    });

    it('should verify delegated revocation request', async () => {
      const revocationRequest = {
        uid,
        value: 1000
      };

      const signature = await eip712ProxyUtils.signDelegatedProxyRevocation(
        sender,
        schemaId,
        revocationRequest.uid,
        deadline
      );

      await expect(
        proxy.connect(sender).verifyRevoke({
          schema: schemaId,
          data: revocationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          revoker: await sender.getAddress(),
          deadline
        })
      ).not.to.be.reverted;
    });

    it('should revert when verifying delegated revocation request with a wrong signature', async () => {
      const revocationRequest = {
        uid,
        value: 1000
      };

      const signature = await eip712ProxyUtils.signDelegatedProxyRevocation(
        sender,
        schemaId,
        revocationRequest.uid,
        deadline
      );

      await expect(
        proxy.connect(sender).verifyRevoke({
          schema: schemaId,
          data: revocationRequest,
          signature: { v: signature.v, r: encodeBytes32String('BAD'), s: hexlify(signature.s) },
          revoker: await sender.getAddress(),
          deadline
        })
      ).to.be.revertedWithCustomError(proxy, 'InvalidSignature');

      await expect(
        proxy.connect(sender).verifyRevoke({
          schema: schemaId,
          data: revocationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          revoker: await sender2.getAddress(),
          deadline
        })
      ).to.be.revertedWithCustomError(proxy, 'InvalidSignature');
    });

    it('should revert when verifying delegated revocation request with a used signature', async () => {
      const revocationRequest = {
        uid,
        value: 1000
      };
      const signature = await eip712ProxyUtils.signDelegatedProxyRevocation(
        sender,
        schemaId,
        revocationRequest.uid,
        deadline
      );

      await expect(
        proxy.connect(sender).verifyRevoke({
          schema: schemaId,
          data: revocationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          revoker: await sender.getAddress(),
          deadline
        })
      ).not.to.be.reverted;

      await expect(
        proxy.connect(sender).verifyRevoke({
          schema: schemaId,
          data: revocationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          revoker: await sender.getAddress(),
          deadline
        })
      ).to.be.revertedWithCustomError(proxy, 'UsedSignature');
    });

    it('should revert when verifying delegated revocation request with an expired deadline', async () => {
      const revocationRequest = {
        uid,
        value: 1000
      };

      const expiredDeadline = 1n;
      const signature = await eip712ProxyUtils.signDelegatedProxyRevocation(
        sender,
        schemaId,
        revocationRequest.uid,
        expiredDeadline
      );

      await expect(
        proxy.connect(sender).verifyRevoke({
          schema: schemaId,
          data: revocationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          revoker: await sender.getAddress(),
          deadline: expiredDeadline
        })
      ).to.be.revertedWithCustomError(proxy, 'DeadlineExpired');
    });
  });

  it('should revert when multi delegation revoking with inconsistent input lengths', async () => {
    const uid = ZERO_BYTES32;
    const uid2 = ZERO_BYTES32;

    await expect(
      proxy.multiRevokeByDelegation([
        {
          schema: schemaId,
          data: [
            { uid, value: 0 },
            { uid: uid2, value: 0 }
          ],
          signatures: [
            {
              v: 28,
              r: encodeBytes32String('1'),
              s: encodeBytes32String('2')
            }
          ],
          revoker: await sender.getAddress(),
          deadline: NO_EXPIRATION
        }
      ])
    ).to.be.revertedWithCustomError(eas, 'InvalidLength');

    await expect(
      proxy.multiRevokeByDelegation([
        {
          schema: schemaId,
          data: [],
          signatures: [
            {
              v: 28,
              r: encodeBytes32String('1'),
              s: encodeBytes32String('2')
            }
          ],
          revoker: await sender.getAddress(),
          deadline: NO_EXPIRATION
        }
      ])
    ).to.be.revertedWithCustomError(eas, 'InvalidLength');

    await expect(
      proxy.multiRevokeByDelegation([
        {
          schema: schemaId,
          data: [{ uid, value: 0 }],
          signatures: [
            {
              v: 28,
              r: encodeBytes32String('1'),
              s: encodeBytes32String('2')
            },
            {
              v: 28,
              r: encodeBytes32String('3'),
              s: encodeBytes32String('4')
            }
          ],
          revoker: await sender.getAddress(),
          deadline: NO_EXPIRATION
        }
      ])
    ).to.be.revertedWithCustomError(eas, 'InvalidLength');

    await expect(
      eas.multiRevokeByDelegation([
        {
          schema: schemaId,
          data: [
            { uid, value: 0 },
            { uid: uid2, value: 0 }
          ],
          signatures: [],
          revoker: await sender.getAddress()
        }
      ])
    ).to.be.revertedWithCustomError(eas, 'InvalidLength');
  });
});
