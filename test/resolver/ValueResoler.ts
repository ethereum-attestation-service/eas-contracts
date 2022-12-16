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

describe('ValueResolver', () => {
  let accounts: SignerWithAddress[];
  let recipient: SignerWithAddress;
  let sender: Wallet;

  let registry: SchemaRegistry;
  let verifier: EIP712Verifier;
  let eas: TestEAS;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
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
    verifier = await Contracts.EIP712Verifier.deploy();
    eas = await Contracts.TestEAS.deploy(registry.address, verifier.address);

    await eas.setTime(await latest());

    const resolver = await Contracts.ValueResolver.deploy(eas.address, targetValue);
    expect(await resolver.isPayable()).to.be.true;

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should revert when attesting with the wrong value', async () => {
    const value = targetValue + 1;

    await expectFailedAttestation(
      { eas },
      { recipient: recipient.address, schema: schemaId, expirationTime, data, value },
      { from: sender },
      'InvalidAttestation'
    );

    await expectFailedAttestations(
      { eas },
      [
        { recipient: recipient.address, schema: schemaId, expirationTime, data, value },
        { recipient: recipient.address, schema: schemaId, expirationTime, data, value: targetValue }
      ],
      { from: sender },
      'InvalidAttestation'
    );

    await expectFailedAttestations(
      { eas },
      [
        { recipient: recipient.address, schema: schemaId, expirationTime, data, value: targetValue },
        { recipient: recipient.address, schema: schemaId, expirationTime, data, value }
      ],
      { from: sender },
      'InvalidAttestation'
    );
  });

  it('should allow attesting with the correct value', async () => {
    const value = targetValue;
    const { uuid } = await expectAttestation(
      { eas },
      { recipient: recipient.address, schema: schemaId, expirationTime, data, value },
      { from: sender }
    );

    await expectRevocation({ eas }, { uuid }, { from: sender });

    const res = await expectAttestations(
      { eas },
      [
        { recipient: recipient.address, schema: schemaId, expirationTime, data, value },
        { recipient: recipient.address, schema: schemaId, expirationTime, data, value }
      ],
      { from: sender }
    );

    await expectRevocations(
      { eas },
      res.map((r) => ({ uuid: r.uuid })),
      { from: sender }
    );
  });

  it('should revert when attempting to attest with more value than was actually sent', async () => {
    const value = targetValue;

    await expectFailedAttestation(
      { eas },
      { recipient: recipient.address, schema: schemaId, expirationTime, data, value: value + 1000 },
      { from: sender, value },
      'InsufficientValue'
    );
  });

  it('should allow attesting with the correct value when accidentally sending too much', async () => {
    const value = targetValue;
    const { uuid } = await expectAttestation(
      { eas },
      { recipient: recipient.address, schema: schemaId, expirationTime, data, value },
      { from: sender, value: value + 1000 }
    );

    await expectRevocation({ eas }, { uuid }, { from: sender });
  });
});
