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

describe('RecipientResolver', () => {
  let accounts: SignerWithAddress[];
  let recipient: SignerWithAddress;
  let sender: Wallet;

  let registry: SchemaRegistry;
  let verifier: EIP712Verifier;
  let eas: TestEAS;

  const schema = 'S';
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
    verifier = await Contracts.EIP712Verifier.deploy();
    eas = await Contracts.TestEAS.deploy(registry.address, verifier.address);

    await eas.setTime(await latest());

    targetRecipient = accounts[5];

    const resolver = await Contracts.RecipientResolver.deploy(eas.address, targetRecipient.address);
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver);
  });

  it('should revert when attesting to a wrong recipient', async () => {
    await expectFailedAttestation(
      eas,
      recipient.address,
      schemaId,
      expirationTime,
      ZERO_BYTES32,
      data,
      'InvalidAttestation',
      { from: sender }
    );
  });

  it('should allow attesting to the correct recipient', async () => {
    const { uuid } = await expectAttestation(
      eas,
      targetRecipient.address,
      schemaId,
      expirationTime,
      ZERO_BYTES32,
      data,
      {
        from: sender
      }
    );

    await expectRevocation(eas, uuid, { from: sender });
  });
});
