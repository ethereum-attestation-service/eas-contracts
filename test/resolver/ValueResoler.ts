import Contracts from '../../components/Contracts';
import { EIP712Verifier, SchemaRegistry, TestEAS } from '../../typechain-types';
import { ZERO_BYTES32 } from '../../utils/Constants';
import { expectAttestation, expectFailedAttestation, expectRevocation, registerSchema } from '../helpers/EAS';
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
    await expectFailedAttestation(
      eas,
      recipient.address,
      schemaId,
      expirationTime,
      true,
      ZERO_BYTES32,
      data,
      'InvalidAttestation',
      { from: sender, value: targetValue + 1 }
    );
  });

  it('should allow attesting with the correct value', async () => {
    const { uuid } = await expectAttestation(
      eas,
      recipient.address,
      schemaId,
      expirationTime,
      true,
      ZERO_BYTES32,
      data,
      {
        from: sender,
        value: targetValue
      }
    );

    await expectRevocation(eas, uuid, { from: sender });
  });
});
