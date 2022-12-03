import Contracts from '../../components/Contracts';
import { EIP712Verifier, SchemaRegistry, TestEAS } from '../../typechain-types';
import { ZERO_BYTES32 } from '../../utils/Constants';
import { expectAttestation, expectFailedAttestation, expectRevocation, registerSchema } from '../helpers/EAS';
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
  let verifier: EIP712Verifier;
  let eas: TestEAS;

  const schema = 'S';
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
    verifier = await Contracts.EIP712Verifier.deploy();
    eas = await Contracts.TestEAS.deploy(registry.address, verifier.address);

    await eas.setTime(await latest());

    validAfter = (await eas.getTime()) + duration.years(1);

    const resolver = await Contracts.ExpirationTimeResolver.deploy(eas.address, validAfter);
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should revert when attesting with a wrong expiration time', async () => {
    await expectFailedAttestation(
      eas,
      recipient.address,
      schemaId,
      validAfter - duration.days(1),
      true,
      ZERO_BYTES32,
      data,
      'InvalidAttestation',
      { from: sender }
    );
  });

  it('should allow attesting with the correct expiration time', async () => {
    const { uuid } = await expectAttestation(
      eas,
      recipient.address,
      schemaId,
      validAfter + duration.seconds(1),
      true,
      ZERO_BYTES32,
      data,
      {
        from: sender
      }
    );

    await expectRevocation(eas, uuid, { from: sender });
  });
});
