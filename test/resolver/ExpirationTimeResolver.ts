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
import { duration, latest } from '../helpers/Time';
import { createWallet } from '../helpers/Wallet';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { BaseWallet } from 'ethers';
import { ethers } from 'hardhat';

describe('ExpirationTimeResolver', () => {
  let accounts: HardhatEthersSigner[];
  let recipient: HardhatEthersSigner;
  let sender: BaseWallet;

  let registry: SchemaRegistry;
  let eas: TestEAS;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
  const data = '0x1234';
  let validAfter: bigint;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(await registry.getAddress());

    await eas.setTime(await latest());

    validAfter = (await eas.getTime()) + duration.years(1n);

    const resolver = await Contracts.ExpirationTimeResolver.deploy(await eas.getAddress(), validAfter);
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should revert when attesting with a wrong expiration time', async () => {
    await expectFailedAttestation(
      { eas },
      schemaId,
      { recipient: recipient.address, expirationTime: validAfter - duration.days(1n), data },
      { from: sender },
      'InvalidAttestation'
    );

    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: recipient.address, expirationTime: validAfter - duration.days(1n), data },
            { recipient: recipient.address, expirationTime: validAfter + duration.seconds(1n), data }
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
          schema: schemaId,
          requests: [
            { recipient: recipient.address, expirationTime: validAfter + duration.days(1n), data },
            { recipient: recipient.address, expirationTime: validAfter - duration.seconds(1n), data }
          ]
        }
      ],
      { from: sender },
      'InvalidAttestation'
    );
  });

  it('should allow attesting with the correct expiration time', async () => {
    const { uid } = await expectAttestation(
      { eas },
      schemaId,
      { recipient: recipient.address, expirationTime: validAfter + duration.seconds(1n), data },
      { from: sender }
    );

    await expectRevocation({ eas }, schemaId, { uid }, { from: sender });

    const res = await expectMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: recipient.address, expirationTime: validAfter + duration.seconds(1n), data },
            { recipient: recipient.address, expirationTime: validAfter + duration.weeks(1n), data }
          ]
        }
      ],
      { from: sender }
    );

    await expectMultiRevocations(
      { eas },
      [
        {
          schema: schemaId,
          requests: res.uids.map((uid) => ({ uid }))
        }
      ],
      { from: sender }
    );
  });
});
