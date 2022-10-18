import Contracts from '../../components/Contracts';
import { EIP712Verifier, SchemaRegistry, TestEAS } from '../../typechain-types';
import { ZERO_BYTES32 } from '../../utils/Constants';
import { expectAttestation, expectFailedAttestation, registerSchema } from '../helpers/EAS';
import { latest } from '../helpers/Time';
import { createWallet } from '../helpers/Wallet';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

describe('DataResolver', () => {
  let accounts: SignerWithAddress[];
  let recipient: SignerWithAddress;
  let sender: Wallet;

  let registry: SchemaRegistry;
  let verifier: EIP712Verifier;
  let eas: TestEAS;

  const schema = 'S';
  let schemaId: string;
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

    const resolver = await Contracts.DataResolver.deploy(eas.address);
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver);
  });

  it('should revert when attesting with wrong data', async () => {
    await expectFailedAttestation(
      eas,
      recipient.address,
      schemaId,
      expirationTime,
      ZERO_BYTES32,
      '0x1234',
      'InvalidAttestation',
      { from: sender }
    );

    await expectFailedAttestation(
      eas,
      recipient.address,
      schemaId,
      expirationTime,
      ZERO_BYTES32,
      '0x02',
      'InvalidAttestation',
      { from: sender }
    );
  });

  it('should allow attesting with correct data', async () => {
    await expectAttestation(eas, recipient.address, schemaId, expirationTime, ZERO_BYTES32, '0x00', { from: sender });
    await expectAttestation(eas, recipient.address, schemaId, expirationTime, ZERO_BYTES32, '0x01', { from: sender });
  });
});
