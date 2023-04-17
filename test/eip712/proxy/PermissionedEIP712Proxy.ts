import Contracts from '../../../components/Contracts';
import { PermissionedEIP712Proxy, SchemaRegistry, TestEAS } from '../../../typechain-types';
import { NO_EXPIRATION, ZERO_ADDRESS, ZERO_BYTES } from '../../../utils/Constants';
import { getSchemaUID } from '../../../utils/EAS';
import {
  expectAttestation,
  expectFailedAttestation,
  expectFailedMultiAttestations,
  expectFailedMultiRevocations,
  expectFailedRevocation,
  expectMultiAttestations,
  expectMultiRevocations,
  expectRevocation,
  SignatureType
} from '../../helpers/EAS';
import {
  ATTEST_PROXY_TYPED_SIGNATURE,
  EIP712ProxyUtils,
  REVOKE_PROXY_TYPED_SIGNATURE
} from '../../helpers/EIP712ProxyUtils';
import { latest } from '../../helpers/Time';
import { createWallet } from '../../helpers/Wallet';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

const {
  utils: { keccak256, toUtf8Bytes, hexlify }
} = ethers;

const PERMISSIONED_EIP712_PROXY_NAME = 'PermissionedEIP712Proxy';

describe('PermissionedEIP712Proxy', () => {
  let accounts: SignerWithAddress[];
  let owner: Wallet;
  let nonOwner: Wallet;
  let recipient: SignerWithAddress;

  let registry: SchemaRegistry;
  let eas: TestEAS;
  let proxy: PermissionedEIP712Proxy;
  let eip712ProxyUtils: EIP712ProxyUtils;

  const schema = 'bool like';
  const schemaId = getSchemaUID(schema, ZERO_ADDRESS, true);
  const expirationTime = NO_EXPIRATION;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    owner = await createWallet();
    nonOwner = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(registry.address);

    await eas.setTime(await latest());

    proxy = await Contracts.connect(owner).PermissionedEIP712Proxy.deploy(eas.address, PERMISSIONED_EIP712_PROXY_NAME);

    eip712ProxyUtils = await EIP712ProxyUtils.fromProxy(proxy);

    await registry.register(schema, ZERO_ADDRESS, true);
  });

  describe('construction', () => {
    it('should revert when initialized with an empty schema registry', async () => {
      await expect(Contracts.EAS.deploy(ZERO_ADDRESS)).to.be.revertedWith('InvalidRegistry');
    });

    it('should be properly initialized', async () => {
      expect(await proxy.VERSION()).to.equal('0.1');

      expect(await proxy.getDomainSeparator()).to.equal(
        eip712ProxyUtils.getDomainSeparator(PERMISSIONED_EIP712_PROXY_NAME)
      );
      expect(await proxy.getAttestTypeHash()).to.equal(keccak256(toUtf8Bytes(ATTEST_PROXY_TYPED_SIGNATURE)));
      expect(await proxy.getRevokeTypeHash()).to.equal(keccak256(toUtf8Bytes(REVOKE_PROXY_TYPED_SIGNATURE)));
      expect(await proxy.getName()).to.equal(PERMISSIONED_EIP712_PROXY_NAME);
    });
  });

  describe('attest', () => {
    it('should allow the owner to attest', async () => {
      await expectAttestation(
        { eas, eip712ProxyUtils },
        schemaId,
        { recipient: recipient.address, expirationTime, data: hexlify(0) },
        { signatureType: SignatureType.DelegatedProxy, from: owner }
      );

      await expectMultiAttestations(
        { eas, eip712ProxyUtils },
        [
          {
            schema: schemaId,
            requests: [
              { recipient: recipient.address, expirationTime, data: hexlify(1) },
              { recipient: recipient.address, expirationTime, data: hexlify(2) }
            ]
          }
        ],
        { signatureType: SignatureType.DelegatedProxy, from: owner }
      );
    });

    it('should revert when a non-owner attempts to attest', async () => {
      await expectFailedAttestation(
        { eas, eip712ProxyUtils },
        schemaId,
        { recipient: recipient.address, expirationTime, data: hexlify(0) },
        { signatureType: SignatureType.DelegatedProxy, from: nonOwner },
        'Ownable: caller is not the owner'
      );

      await expectFailedMultiAttestations(
        { eas, eip712ProxyUtils },
        [
          {
            schema: schemaId,
            requests: [
              { recipient: recipient.address, expirationTime, data: hexlify(1) },
              { recipient: recipient.address, expirationTime, data: hexlify(2) }
            ]
          }
        ],
        { signatureType: SignatureType.DelegatedProxy, from: nonOwner },
        'Ownable: caller is not the owner'
      );
    });
  });

  describe('revoke', () => {
    let uid: string;
    let uids: string[] = [];

    beforeEach(async () => {
      ({ uid } = await expectAttestation(
        { eas, eip712ProxyUtils },
        schemaId,
        { recipient: recipient.address, expirationTime: NO_EXPIRATION, data: ZERO_BYTES },
        { signatureType: SignatureType.DelegatedProxy, from: owner }
      ));

      uids = [];

      for (let i = 0; i < 2; i++) {
        const { uid: newUid } = await expectAttestation(
          { eas, eip712ProxyUtils },
          schemaId,
          { recipient: recipient.address, expirationTime, data: hexlify(i + 1) },
          { signatureType: SignatureType.DelegatedProxy, from: owner }
        );

        uids.push(newUid);
      }
    });

    it('should allow the owner to revoke', async () => {
      await expectRevocation(
        { eas, eip712ProxyUtils },
        schemaId,
        { uid },
        { signatureType: SignatureType.DelegatedProxy, from: owner }
      );

      await expectMultiRevocations(
        { eas, eip712ProxyUtils },
        [
          {
            schema: schemaId,
            requests: uids.map((uid) => ({ uid }))
          }
        ],
        { signatureType: SignatureType.DelegatedProxy, from: owner }
      );
    });

    it('should revert when a non-owner attempts to revoke', async () => {
      await expectFailedRevocation(
        { eas, eip712ProxyUtils },
        schemaId,
        { uid },
        { signatureType: SignatureType.DelegatedProxy, from: nonOwner },
        'Ownable: caller is not the owner'
      );

      await expectFailedMultiRevocations(
        { eas, eip712ProxyUtils },
        [
          {
            schema: schemaId,
            requests: uids.map((uid) => ({ uid }))
          }
        ],
        { signatureType: SignatureType.DelegatedProxy, from: nonOwner },
        'Ownable: caller is not the owner'
      );
    });
  });
});
