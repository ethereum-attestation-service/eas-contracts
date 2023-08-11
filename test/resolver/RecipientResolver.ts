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

describe('RecipientResolver', () => {
  let accounts: Signer[];
  let recipient: Signer;
  let sender: Signer;

  let registry: SchemaRegistry;
  let eas: TestEAS;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
  const expirationTime = NO_EXPIRATION;
  const data = '0x1234';

  let targetRecipient: Signer;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(await registry.getAddress());

    await eas.setTime(await latest());

    targetRecipient = accounts[5];

    const resolver = await Contracts.RecipientResolver.deploy(
      await eas.getAddress(),
      await targetRecipient.getAddress()
    );
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should revert when attesting to a wrong recipient', async () => {
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
            { recipient: await targetRecipient.getAddress(), expirationTime, data }
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
          schema: schemaId,
          requests: [
            { recipient: await targetRecipient.getAddress(), expirationTime, data },
            { recipient: await recipient.getAddress(), expirationTime, data }
          ]
        }
      ],
      { from: sender },
      'InvalidAttestations'
    );
  });

  it('should allow attesting to the correct recipient', async () => {
    const { uid } = await expectAttestation(
      { eas },
      schemaId,
      { recipient: await targetRecipient.getAddress(), expirationTime, data },
      { from: sender }
    );

    await expectRevocation({ eas }, schemaId, { uid }, { from: sender });

    const res = await expectMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: await targetRecipient.getAddress(), expirationTime, data },
            { recipient: await targetRecipient.getAddress(), expirationTime, data }
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
