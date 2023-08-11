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

describe('AttesterResolver', () => {
  let accounts: Signer[];
  let recipient: Signer;
  let sender: Signer;
  let sender2: Signer;
  let targetSender: Signer;

  let registry: SchemaRegistry;
  let eas: TestEAS;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
  const data = '0x1234';
  const expirationTime = NO_EXPIRATION;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(await registry.getAddress());

    await eas.setTime(await latest());

    sender2 = await createWallet();
    targetSender = sender2;

    const resolver = await Contracts.AttesterResolver.deploy(await eas.getAddress(), await targetSender.getAddress());
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should revert when attesting via the wrong attester', async () => {
    await expectFailedAttestation(
      { eas },
      schemaId,
      { recipient: await recipient.getAddress(), expirationTime, data },
      { from: sender },
      'InvalidAttestation'
    );

    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: await recipient.getAddress(), expirationTime, data },
            { recipient: await recipient.getAddress(), expirationTime, data }
          ]
        }
      ],
      { from: sender },
      'InvalidAttestations'
    );
  });

  it('should allow attesting via the correct attester', async () => {
    const { uid } = await expectAttestation(
      { eas },
      schemaId,
      { recipient: await recipient.getAddress(), expirationTime, data },
      { from: targetSender }
    );

    await expectRevocation({ eas }, schemaId, { uid }, { from: targetSender });

    const res = await expectMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: await recipient.getAddress(), expirationTime, data },
            { recipient: await recipient.getAddress(), expirationTime, data }
          ]
        }
      ],
      { from: targetSender }
    );

    await expectMultiRevocations(
      { eas },
      [
        {
          schema: schemaId,
          requests: res.uids.map((uid) => ({ uid }))
        }
      ],
      { from: targetSender }
    );
  });
});
