import Contracts from '../../components/Contracts';
import { SchemaRegistry, TestEAS } from '../../typechain-types';
import {
  expectAttestation,
  expectFailedAttestation,
  expectFailedMultiAttestations,
  expectMultiAttestations,
  expectMultiRevocations,
  expectRevocation,
  registerSchema
} from '../helpers/EAS';
import { latest } from '../helpers/Time';
import { createWallet } from '../helpers/Wallet';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

describe('ValueResolver', () => {
  let accounts: SignerWithAddress[];
  let recipient: SignerWithAddress;
  let sender: Wallet;

  let registry: SchemaRegistry;
  let eas: TestEAS;

  const schema1 = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  const schema2 = 'bytes32 eventId';
  const schema3 = 'bool like';
  let schema1Id: string;
  let schema2Id: string;
  let schema3Id: string;
  const expirationTime = 0;
  const data = '0x1234';

  const targetValue = 12345;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(registry.address);

    await eas.setTime(await latest());

    const resolver = await Contracts.ValueResolver.deploy(eas.address, targetValue);
    expect(await resolver.isPayable()).to.be.true;

    schema1Id = await registerSchema(schema1, registry, resolver, true);
    schema2Id = await registerSchema(schema2, registry, resolver, true);
    schema3Id = await registerSchema(schema3, registry, resolver, true);
  });

  it('should revert when attesting with the wrong value', async () => {
    const value = targetValue + 1;

    await expectFailedAttestation(
      { eas },
      schema1Id,
      { recipient: recipient.address, expirationTime, data, value },
      { from: sender },
      'InvalidAttestation'
    );

    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schema1Id,
          requests: [
            { recipient: recipient.address, expirationTime, data, value },
            { recipient: recipient.address, expirationTime, data, value: targetValue }
          ]
        }
      ],
      { from: sender },
      'InvalidAttestation'
    );

    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schema1Id,
          requests: [
            { recipient: recipient.address, expirationTime, data, value: targetValue },
            { recipient: recipient.address, expirationTime, data, value }
          ]
        }
      ],
      { from: sender },
      'InvalidAttestation'
    );
  });

  it('should allow attesting with the correct value', async () => {
    const value = targetValue;
    const { uid } = await expectAttestation(
      { eas },
      schema1Id,
      { recipient: recipient.address, expirationTime, data, value },
      { from: sender }
    );

    await expectRevocation({ eas }, schema1Id, { uid }, { from: sender });

    const { uids } = await expectMultiAttestations(
      { eas },
      [
        {
          schema: schema1Id,
          requests: [
            { recipient: recipient.address, expirationTime, data, value },
            { recipient: recipient.address, expirationTime, data, value }
          ]
        },
        {
          schema: schema2Id,
          requests: [{ recipient: recipient.address, expirationTime, data, value }]
        },
        {
          schema: schema3Id,
          requests: [
            { recipient: recipient.address, expirationTime, data, value },
            { recipient: recipient.address, expirationTime, data, value }
          ]
        }
      ],
      { from: sender }
    );

    await expectMultiRevocations(
      { eas },
      [
        {
          schema: schema1Id,
          requests: [{ uid: uids[0] }, { uid: uids[1] }]
        },
        {
          schema: schema2Id,
          requests: [{ uid: uids[2] }]
        },
        {
          schema: schema3Id,
          requests: [{ uid: uids[3] }, { uid: uids[4] }]
        }
      ],
      { from: sender }
    );
  });

  it('should revert when attempting to attest with more value than was actually sent', async () => {
    const value = targetValue;

    await expectFailedAttestation(
      { eas },
      schema1Id,
      { recipient: recipient.address, expirationTime, data, value: value + 1000 },
      { from: sender, value },
      'InsufficientValue'
    );

    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schema1Id,
          requests: [
            { recipient: recipient.address, expirationTime, data, value: value - 500 },
            { recipient: recipient.address, expirationTime, data, value: 500 },
            { recipient: recipient.address, expirationTime, data, value: 1 }
          ]
        }
      ],
      { from: sender, value },
      'InsufficientValue'
    );
  });

  it('should allow attesting with the correct value when accidentally sending too much', async () => {
    const value = targetValue;
    const { uid } = await expectAttestation(
      { eas },
      schema1Id,
      { recipient: recipient.address, expirationTime, data, value },
      { from: sender, value: value + 1000 }
    );

    await expectRevocation({ eas }, schema1Id, { uid }, { from: sender });

    const { uids } = await expectMultiAttestations(
      { eas },
      [
        {
          schema: schema1Id,
          requests: [
            { recipient: recipient.address, expirationTime, data, value },
            { recipient: recipient.address, expirationTime, data, value }
          ]
        },
        {
          schema: schema2Id,
          requests: [
            { recipient: recipient.address, expirationTime, data, value },
            { recipient: recipient.address, expirationTime, data, value }
          ]
        }
      ],
      { from: sender, value: value * 4 + 9999 }
    );

    await expectMultiRevocations(
      { eas },
      [
        {
          schema: schema1Id,
          requests: [{ uid: uids[0] }, { uid: uids[1] }]
        },
        {
          schema: schema2Id,
          requests: [{ uid: uids[2] }, { uid: uids[3] }]
        }
      ],
      { from: sender }
    );
  });
});
