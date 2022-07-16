import Contracts from '../components/Contracts';
import { ASRegistry } from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

const {
  constants: { AddressZero },
  utils: { solidityKeccak256, formatBytes32String }
} = ethers;

const ZERO_BYTES = '0x';
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

let accounts: SignerWithAddress[];
let sender: SignerWithAddress;

let registry: ASRegistry;

describe('ASRegistry', () => {
  before(async () => {
    accounts = await ethers.getSigners();

    [sender] = accounts;
  });

  beforeEach(async () => {
    registry = await Contracts.ASRegistry.deploy();
  });

  const getUUID = (schema: string, resolver: string) => solidityKeccak256(['bytes', 'address'], [schema, resolver]);

  describe('construction', async () => {
    it('should report a version', async () => {
      expect(await registry.VERSION()).to.equal('0.9');
    });

    it('should initialize without any Ss', async () => {
      expect(await registry.getASCount()).to.equal(0);
    });
  });

  describe('registration', async () => {
    const testRegister = async (schema: string, resolver: string | SignerWithAddress) => {
      const resolverAddress = typeof resolver === 'string' ? resolver : resolver.address;

      const uuid = getUUID(schema, resolverAddress);
      const index = (await registry.getASCount()).add(1);

      const retUUID = await registry.callStatic.register(schema, resolverAddress);
      const res = await registry.register(schema, resolverAddress);
      expect(retUUID).to.equal(uuid);
      await expect(res).to.emit(registry, 'Registered').withArgs(uuid, index, schema, resolverAddress, sender.address);
      expect(await registry.getASCount()).to.equal(index);

      const asRecord = await registry.getAS(uuid);
      expect(asRecord.uuid).to.equal(uuid);
      expect(asRecord.index).to.equal(index);
      expect(asRecord.schema).to.equal(schema);
      expect(asRecord.resolver).to.equal(resolverAddress);
    };

    it('should allow to register an AS without a schema', async () => {
      await testRegister(ZERO_BYTES, accounts[3]);
    });

    it('should allow to register an AS without a resolver', async () => {
      await testRegister('0x1234', AddressZero);
    });

    it('should allow to register an AS without neither a schema or a resolver', async () => {
      await testRegister(ZERO_BYTES, AddressZero);
    });

    it('should not allow to register the same schema and resolver twice', async () => {
      await testRegister('0x1234', AddressZero);
      await expect(testRegister('0x1234', AddressZero)).to.be.revertedWith('AlreadyExists');
    });
  });

  describe('AS querying', async () => {
    it('should return an AS', async () => {
      const schema = '0x1234';
      const resolver = accounts[5];

      await registry.register(schema, resolver.address);

      const uuid = getUUID(schema, resolver.address);
      const asRecord = await registry.getAS(uuid);
      expect(asRecord.uuid).to.equal(uuid);
      expect(asRecord.index).to.equal(1);
      expect(asRecord.schema).to.equal(schema);
      expect(asRecord.resolver).to.equal(resolver.address);
    });

    it('should return an empty AS given non-existing id', async () => {
      const asRecord = await registry.getAS(formatBytes32String('BAD'));
      expect(asRecord.uuid).to.equal(ZERO_BYTES32);
      expect(asRecord.index).to.equal(0);
      expect(asRecord.schema).to.equal(ZERO_BYTES);
      expect(asRecord.resolver).to.equal(AddressZero);
    });
  });
});
