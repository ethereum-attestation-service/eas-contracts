import { expect } from 'chai';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../../components/Contracts';
import { SchemaRegistry, TestEAS } from '../../typechain-types';
import { NO_EXPIRATION } from '../../utils/Constants';
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

describe('ValueResolver', () => {
  let accounts: Signer[];
  let recipient: Signer;
  let sender: Signer;

  let registry: SchemaRegistry;
  let eas: TestEAS;

  const schema1 = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  const schema2 = 'bytes32 eventId';
  const schema3 = 'bool like';
  let schema1Id: string;
  let schema2Id: string;
  let schema3Id: string;
  const expirationTime = NO_EXPIRATION;
  const data = '0x1234';

  const targetValue = 12345n;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(await registry.getAddress());

    await eas.setTime(await latest());

    const resolver = await Contracts.ValueResolver.deploy(await eas.getAddress(), targetValue);
    expect(await resolver.isPayable()).to.be.true;

    schema1Id = await registerSchema(schema1, registry, resolver, true);
    schema2Id = await registerSchema(schema2, registry, resolver, true);
    schema3Id = await registerSchema(schema3, registry, resolver, true);
  });

  it('should revert when attesting with the wrong value', async () => {
    const value = targetValue + 1n;

    await expectFailedAttestation(
      { eas },
      schema1Id,
      { recipient: await recipient.getAddress(), expirationTime, data, value },
      { from: sender },
      'InvalidAttestation'
    );

    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schema1Id,
          requests: [
            { recipient: await recipient.getAddress(), expirationTime, data, value },
            { recipient: await recipient.getAddress(), expirationTime, data, value: targetValue }
          ]
        }
      ],
      { from: sender },
      'InvalidAttestations'
    );

    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schema1Id,
          requests: [
            { recipient: await recipient.getAddress(), expirationTime, data, value: targetValue },
            { recipient: await recipient.getAddress(), expirationTime, data, value }
          ]
        }
      ],
      { from: sender },
      'InvalidAttestations'
    );
  });

  it('should allow attesting with the correct value', async () => {
    const value = targetValue;
    const { uid } = await expectAttestation(
      { eas },
      schema1Id,
      { recipient: await recipient.getAddress(), expirationTime, data, value },
      { from: sender }
    );

    await expectRevocation({ eas }, schema1Id, { uid }, { from: sender });

    const { uids } = await expectMultiAttestations(
      { eas },
      [
        {
          schema: schema1Id,
          requests: [
            { recipient: await recipient.getAddress(), expirationTime, data, value },
            { recipient: await recipient.getAddress(), expirationTime, data, value }
          ]
        },
        {
          schema: schema2Id,
          requests: [{ recipient: await recipient.getAddress(), expirationTime, data, value }]
        },
        {
          schema: schema3Id,
          requests: [
            { recipient: await recipient.getAddress(), expirationTime, data, value },
            { recipient: await recipient.getAddress(), expirationTime, data, value }
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
      { recipient: await recipient.getAddress(), expirationTime, data, value: value + 1000n },
      { from: sender, value },
      'InsufficientValue'
    );

    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schema1Id,
          requests: [
            { recipient: await recipient.getAddress(), expirationTime, data, value: value - 500n },
            { recipient: await recipient.getAddress(), expirationTime, data, value: 500n },
            { recipient: await recipient.getAddress(), expirationTime, data, value: 1n }
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
      { recipient: await recipient.getAddress(), expirationTime, data, value },
      { from: sender, value: value + 1000n }
    );

    await expectRevocation({ eas }, schema1Id, { uid }, { from: sender });

    const { uids } = await expectMultiAttestations(
      { eas },
      [
        {
          schema: schema1Id,
          requests: [
            { recipient: await recipient.getAddress(), expirationTime, data, value },
            { recipient: await recipient.getAddress(), expirationTime, data, value }
          ]
        },
        {
          schema: schema2Id,
          requests: [
            { recipient: await recipient.getAddress(), expirationTime, data, value },
            { recipient: await recipient.getAddress(), expirationTime, data, value }
          ]
        }
      ],
      { from: sender, value: value * 4n + 9999n }
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
