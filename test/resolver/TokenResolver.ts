import Contracts from '../../components/Contracts';
import { SchemaRegistry, SchemaResolver, TestEAS, TestERC20Token } from '../../typechain-types';
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
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { BaseWallet } from 'ethers';
import { ethers } from 'hardhat';

describe('TokenResolver', () => {
  let accounts: HardhatEthersSigner[];
  let recipient: HardhatEthersSigner;
  let sender: BaseWallet;

  let registry: SchemaRegistry;
  let eas: TestEAS;
  let resolver: SchemaResolver;

  const targetAmount = 22334;
  let token: TestERC20Token;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
  const data = '0x1234';
  const expirationTime = NO_EXPIRATION;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(await registry.getAddress());

    await eas.setTime(await latest());

    token = await Contracts.TestERC20Token.deploy('TKN', 'TKN', 9999999999);
    await token.transfer(sender.address, targetAmount * 100);

    resolver = await Contracts.TokenResolver.deploy(await eas.getAddress(), await token.getAddress(), targetAmount);
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

    await token.connect(sender).approve(await resolver.getAddress(), targetAmount - 1);
    await expectFailedAttestation(
      { eas },
      schemaId,
      { recipient: recipient.address, expirationTime, data },
      { from: sender },
      'ERC20: insufficient allowance'
    );

    await token.connect(sender).approve(await resolver.getAddress(), targetAmount * 2 - 1);
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
    await token.connect(sender).approve(await resolver.getAddress(), targetAmount);

    const { uid } = await expectAttestation(
      { eas },
      schemaId,
      { recipient: recipient.address, expirationTime, data },
      { from: sender }
    );

    await expectRevocation({ eas }, schemaId, { uid }, { from: sender });

    await token.connect(sender).approve(await resolver.getAddress(), targetAmount * 2);

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
          requests: res.uids.map((uid) => ({ uid }))
        }
      ],
      { from: sender }
    );
  });
});
