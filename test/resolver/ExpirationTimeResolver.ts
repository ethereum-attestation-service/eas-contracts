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
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

describe('ExpirationTimeResolver', () => {
  let accounts: SignerWithAddress[];
  let recipient: SignerWithAddress;
  let sender: Wallet;

  let registry: SchemaRegistry;
  let eas: TestEAS;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
  const data = '0x1234';
  let validAfter: number;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(registry.address);

    await eas.setTime(await latest());

    validAfter = (await eas.getTime()).toNumber() + duration.years(1);

    const resolver = await Contracts.ExpirationTimeResolver.deploy(eas.address, validAfter);
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should revert when attesting with a wrong expiration time', async () => {
    await expectFailedAttestation(
      { eas },
      schemaId,
      { recipient: recipient.address, expirationTime: validAfter - duration.days(1), data },
      { from: sender },
      'InvalidAttestation'
    );

    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: recipient.address, expirationTime: validAfter - duration.days(1), data },
            { recipient: recipient.address, expirationTime: validAfter + duration.seconds(1), data }
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
            { recipient: recipient.address, expirationTime: validAfter + duration.days(1), data },
            { recipient: recipient.address, expirationTime: validAfter - duration.seconds(1), data }
          ]
        }
      ],
      { from: sender },
      'InvalidAttestation'
    );
  });

  it('should allow attesting with the correct expiration time', async () => {
    const { uuid } = await expectAttestation(
      { eas },
      schemaId,
      { recipient: recipient.address, expirationTime: validAfter + duration.seconds(1), data },
      { from: sender }
    );

    await expectRevocation({ eas }, schemaId, { uuid }, { from: sender });

    const res = await expectMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: recipient.address, expirationTime: validAfter + duration.seconds(1), data },
            { recipient: recipient.address, expirationTime: validAfter + duration.weeks(1), data }
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
          requests: res.uuids.map((uuid) => ({ uuid }))
        }
      ],
      { from: sender }
    );
  });
});
