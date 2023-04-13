import Contracts from '../components/Contracts';
import { SchemaRegistry, TestEAS, TestEIP712Proxy } from '../typechain-types';
import { NO_EXPIRATION, ZERO_ADDRESS, ZERO_BYTES, ZERO_BYTES32 } from '../utils/Constants';
import { ATTEST_PROXY_TYPED_SIGNATURE, EIP712Utils, REVOKE_PROXY_TYPED_SIGNATURE } from './helpers/EIP712Utils';
import { latest } from './helpers/Time';
import { createWallet } from './helpers/Wallet';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

const {
  utils: { formatBytes32String, keccak256, toUtf8Bytes, hexlify }
} = ethers;

const EIP712_PROXY_NAME = 'EAS-Proxy';

describe('EIP712Proxy', () => {
  let accounts: SignerWithAddress[];
  let sender: Wallet;
  let sender2: Wallet;
  let recipient: SignerWithAddress;

  let registry: SchemaRegistry;
  let eas: TestEAS;
  let proxy: TestEIP712Proxy;
  let eip712Utils: EIP712Utils;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();
    sender2 = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(registry.address);

    await eas.setTime(await latest());

    proxy = await Contracts.TestEIP712Proxy.deploy(eas.address, EIP712_PROXY_NAME);

    eip712Utils = await EIP712Utils.fromVerifier(proxy);
  });

  describe('construction', () => {
    it('should revert when initialized with an empty schema registry', async () => {
      await expect(Contracts.EAS.deploy(ZERO_ADDRESS)).to.be.revertedWith('InvalidRegistry');
    });

    it('should be properly initialized', async () => {
      expect(await proxy.VERSION()).to.equal('0.1');

      expect(await proxy.getDomainSeparator()).to.equal(eip712Utils.getDomainSeparator(EIP712_PROXY_NAME));
      expect(await proxy.getAttestTypeHash()).to.equal(keccak256(toUtf8Bytes(ATTEST_PROXY_TYPED_SIGNATURE)));
      expect(await proxy.getRevokeTypeHash()).to.equal(keccak256(toUtf8Bytes(REVOKE_PROXY_TYPED_SIGNATURE)));
      expect(await proxy.getName()).to.equal(EIP712_PROXY_NAME);
    });
  });

  describe('verify attest', () => {
    const schema = ZERO_BYTES32;

    it('should verify delegated attestation request', async () => {
      for (let i = 0; i < 3; ++i) {
        const attestationRequest = {
          recipient: recipient.address,
          expirationTime: NO_EXPIRATION,
          revocable: true,
          refUID: ZERO_BYTES32,
          data: hexlify(i),
          value: 1000
        };

        const signature = await eip712Utils.signProxyDelegatedAttestation(
          sender,
          schema,
          attestationRequest.recipient,
          attestationRequest.expirationTime,
          attestationRequest.revocable,
          attestationRequest.refUID,
          attestationRequest.data
        );

        await expect(
          proxy.verifyAttest({
            schema,
            data: attestationRequest,
            signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
            attester: sender.address
          })
        ).not.to.be.reverted;
      }
    });

    it('should revert when verifying delegated attestation request with a wrong signature', async () => {
      const attestationRequest = {
        recipient: recipient.address,
        expirationTime: NO_EXPIRATION,
        revocable: true,
        refUID: ZERO_BYTES32,
        data: ZERO_BYTES,
        value: 1000
      };

      const signature = await eip712Utils.signProxyDelegatedAttestation(
        sender,
        schema,
        attestationRequest.recipient,
        attestationRequest.expirationTime,
        attestationRequest.revocable,
        attestationRequest.refUID,
        attestationRequest.data
      );

      await expect(
        proxy.verifyAttest({
          schema,
          data: attestationRequest,
          signature: { v: signature.v, r: formatBytes32String('BAD'), s: hexlify(signature.s) },
          attester: sender.address
        })
      ).to.be.revertedWith('InvalidSignature');

      await expect(
        proxy.verifyAttest({
          schema,
          data: attestationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          attester: sender2.address
        })
      ).to.be.revertedWith('InvalidSignature');
    });

    it('should revert when verifying delegated attestation request with a used signature', async () => {
      const attestationRequest = {
        recipient: recipient.address,
        expirationTime: NO_EXPIRATION,
        revocable: true,
        refUID: ZERO_BYTES32,
        data: ZERO_BYTES,
        value: 1000
      };

      const signature = await eip712Utils.signProxyDelegatedAttestation(
        sender,
        schema,
        attestationRequest.recipient,
        attestationRequest.expirationTime,
        attestationRequest.revocable,
        attestationRequest.refUID,
        attestationRequest.data
      );

      await expect(
        proxy.verifyAttest({
          schema,
          data: attestationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          attester: sender.address
        })
      ).not.to.be.reverted;

      await expect(
        proxy.verifyAttest({
          schema,
          data: attestationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          attester: sender.address
        })
      ).to.be.revertedWith('UsedSignature');
    });
  });

  describe('verify revoke', () => {
    const schema = ZERO_BYTES32;

    it('should verify delegated revocation request', async () => {
      for (let i = 0; i < 3; ++i) {
        const revocationRequest = {
          uid: formatBytes32String(hexlify(i)),
          value: 1000
        };

        const signature = await eip712Utils.signProxyDelegatedRevocation(sender, schema, revocationRequest.uid);

        await expect(
          proxy.verifyRevoke({
            schema,
            data: revocationRequest,
            signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
            revoker: sender.address
          })
        ).not.to.be.reverted;
      }
    });

    it('should revert when verifying delegated revocation request with a wrong signature', async () => {
      const revocationRequest = {
        uid: ZERO_BYTES32,
        value: 1000
      };

      const signature = await eip712Utils.signProxyDelegatedRevocation(sender, schema, revocationRequest.uid);

      await expect(
        proxy.verifyRevoke({
          schema,
          data: revocationRequest,
          signature: { v: signature.v, r: formatBytes32String('BAD'), s: hexlify(signature.s) },
          revoker: sender.address
        })
      ).to.be.revertedWith('InvalidSignature');

      await expect(
        proxy.verifyRevoke({
          schema,
          data: revocationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          revoker: sender2.address
        })
      ).to.be.revertedWith('InvalidSignature');
    });

    it('should revert when verifying delegated revocation request with a used signature', async () => {
      const revocationRequest = {
        uid: ZERO_BYTES32,
        value: 1000
      };
      const signature = await eip712Utils.signProxyDelegatedRevocation(sender, schema, revocationRequest.uid);

      await expect(
        proxy.verifyRevoke({
          schema,
          data: revocationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          revoker: sender.address
        })
      ).not.to.be.reverted;

      await expect(
        proxy.verifyRevoke({
          schema,
          data: revocationRequest,
          signature: { v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) },
          revoker: sender.address
        })
      ).to.be.revertedWith('UsedSignature');
    });
  });
});
