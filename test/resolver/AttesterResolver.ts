import Contracts from '../../components/Contracts';
import { EIP712Verifier, SchemaRegistry, TestEAS } from '../../typechain-types';
import {
  expectAttestation,
  expectAttestations,
  expectFailedAttestation,
  expectFailedAttestations,
  expectRevocation,
  expectRevocations,
  registerSchema
} from '../helpers/EAS';
import { latest } from '../helpers/Time';
import { createWallet } from '../helpers/Wallet';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

describe('AttesterResolver', () => {
  let accounts: SignerWithAddress[];
  let recipient: SignerWithAddress;
  let sender: Wallet;
  let sender2: Wallet;
  let targetSender: Wallet;

  let registry: SchemaRegistry;
  let verifier: EIP712Verifier;
  let eas: TestEAS;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
  const data = '0x1234';
  const expirationTime = 0;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    verifier = await Contracts.EIP712Verifier.deploy();
    eas = await Contracts.TestEAS.deploy(registry.address, verifier.address);

    await eas.setTime(await latest());

    sender2 = await createWallet();
    targetSender = sender2;

    const resolver = await Contracts.AttesterResolver.deploy(eas.address, targetSender.address);
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should revert when attesting via the wrong attester', async () => {
    await expectFailedAttestation(
      { eas },
      { recipient: recipient.address, schema: schemaId, expirationTime, data },
      { from: sender },
      'InvalidAttestation'
    );

    await expectFailedAttestations(
      { eas },
      [
        { recipient: recipient.address, schema: schemaId, expirationTime, data },
        { recipient: recipient.address, schema: schemaId, expirationTime, data }
      ],
      { from: sender },
      'InvalidAttestation'
    );
  });

  it('should allow attesting via the correct attester', async () => {
    const { uuid } = await expectAttestation(
      { eas },
      { recipient: recipient.address, schema: schemaId, expirationTime, data },
      { from: targetSender }
    );

    await expectRevocation({ eas }, { uuid }, { from: targetSender });

    const res = await expectAttestations(
      { eas },
      [
        { recipient: recipient.address, schema: schemaId, expirationTime, data },
        { recipient: recipient.address, schema: schemaId, expirationTime, data }
      ],
      { from: targetSender }
    );

    await expectRevocations(
      { eas },
      res.map((r) => ({ uuid: r.uuid })),
      { from: targetSender }
    );
  });
});
