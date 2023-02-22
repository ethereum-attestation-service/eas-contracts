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

describe('RecipientResolver', () => {
  let accounts: SignerWithAddress[];
  let recipient: SignerWithAddress;
  let sender: Wallet;

  let registry: SchemaRegistry;
  let eas: TestEAS;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
  const expirationTime = 0;
  const data = '0x1234';

  let targetRecipient: SignerWithAddress;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(registry.address);

    await eas.setTime(await latest());

    targetRecipient = accounts[5];

    const resolver = await Contracts.RecipientResolver.deploy(eas.address, targetRecipient.address);
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should revert when attesting to a wrong recipient', async () => {
    await expectFailedAttestation(
      { eas },
      schemaId,
      { recipient: recipient.address, expirationTime, data },
      { from: sender },
      'InvalidAttestation'
    );

    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: recipient.address, expirationTime, data },
            { recipient: targetRecipient.address, expirationTime, data }
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
            { recipient: targetRecipient.address, expirationTime, data },
            { recipient: recipient.address, expirationTime, data }
          ]
        }
      ],
      { from: sender },
      'InvalidAttestation'
    );
  });

  it('should allow attesting to the correct recipient', async () => {
    const { uid } = await expectAttestation(
      { eas },
      schemaId,
      { recipient: targetRecipient.address, expirationTime, data },
      { from: sender }
    );

    await expectRevocation({ eas }, schemaId, { uid }, { from: sender });

    const res = await expectMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: targetRecipient.address, expirationTime, data },
            { recipient: targetRecipient.address, expirationTime, data }
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
