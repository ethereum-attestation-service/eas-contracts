import Contracts from '../../components/Contracts';
import { EIP712Verifier, SchemaRegistry, SchemaResolver, TestEAS, TestERC20Token } from '../../typechain-types';
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
    await token.transfer(sender.address, targetAmount * 100);

    resolver = await Contracts.TokenResolver.deploy(eas.address, token.address, targetAmount);
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should revert when attesting with wrong token amount', async () => {
    await expectFailedAttestation(
      { eas },
      schemaId,
      { recipient: recipient.address, expirationTime, data },
      { from: sender },
      'ERC20: insufficient allowance'
    );

    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: recipient.address, expirationTime, data },
            { recipient: recipient.address, expirationTime, data }
          ]
        }
      ],
      { from: sender },
      'ERC20: insufficient allowance'
    );

    await token.connect(sender).approve(resolver.address, targetAmount - 1);
    await expectFailedAttestation(
      { eas },
      schemaId,
      { recipient: recipient.address, expirationTime, data },
      { from: sender },
      'ERC20: insufficient allowance'
    );

    await token.connect(sender).approve(resolver.address, targetAmount * 2 - 1);
    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: recipient.address, expirationTime, data },
            { recipient: recipient.address, expirationTime, data }
          ]
        }
      ],
      { from: sender },
      'ERC20: insufficient allowance'
    );
  });

  it('should allow attesting with correct token amount', async () => {
    await token.connect(sender).approve(resolver.address, targetAmount);

    const { uuid } = await expectAttestation(
      { eas },
      schemaId,
      { recipient: recipient.address, expirationTime, data },
      { from: sender }
    );

    await expectRevocation({ eas }, schemaId, { uuid }, { from: sender });

    await token.connect(sender).approve(resolver.address, targetAmount * 2);

    const res = await expectMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: recipient.address, expirationTime, data },
            { recipient: recipient.address, expirationTime, data }
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
          requests: res.uuids.map((uuid) => ({ uuid }))
        }
      ],
      { from: sender }
    );
  });
});
