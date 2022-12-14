import Contracts from '../../components/Contracts';
import { EIP712Verifier, SchemaRegistry, SchemaResolver, TestEAS, TestERC20Token } from '../../typechain-types';
import { expectAttestation, expectFailedAttestation, expectRevocation, registerSchema } from '../helpers/EAS';
import { latest } from '../helpers/Time';
import { createWallet } from '../helpers/Wallet';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

describe('TokenResolver', () => {
  let accounts: SignerWithAddress[];
  let recipient: SignerWithAddress;
  let sender: Wallet;

  let registry: SchemaRegistry;
  let verifier: EIP712Verifier;
  let eas: TestEAS;
  let resolver: SchemaResolver;

  const targetAmount = 22334;
  let token: TestERC20Token;

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

    token = await Contracts.TestERC20Token.deploy('TKN', 'TKN', 9999999999);
    await token.transfer(sender.address, targetAmount);

    resolver = await Contracts.TokenResolver.deploy(eas.address, token.address, targetAmount);
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should revert when attesting with wrong token amount', async () => {
    await expectFailedAttestation(
      { eas, recipient: recipient.address, schema: schemaId, expirationTime, data },
      { from: sender },
      'ERC20: insufficient allowance'
    );

    await token.connect(sender).approve(resolver.address, targetAmount - 1);
    await expectFailedAttestation(
      { eas, recipient: recipient.address, schema: schemaId, expirationTime, data },
      { from: sender },
      'ERC20: insufficient allowance'
    );
  });

  it('should allow attesting with correct token amount', async () => {
    await token.connect(sender).approve(resolver.address, targetAmount);

    const { uuid } = await expectAttestation(
      { eas, recipient: recipient.address, schema: schemaId, expirationTime, data },
      { from: sender }
    );

    await expectRevocation({ eas, uuid }, { from: sender });
  });
});
