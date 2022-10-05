import Contracts from '../components/Contracts';
import { SchemaRegistry } from '../typechain-types';
import { ZERO_ADDRESS, ZERO_BYTES, ZERO_BYTES32 } from '../utils/Constants';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

const {
  utils: { solidityKeccak256, formatBytes32String }
} = ethers;

describe('SchemaRegistry', () => {
  let accounts: SignerWithAddress[];
  let sender: SignerWithAddress;

  let registry: SchemaRegistry;

  before(async () => {
    accounts = await ethers.getSigners();

    [sender] = accounts;
  });

  beforeEach(async () => {
    registry = await Contracts.SchemaRegistry.deploy();
  });

  const getUUID = (schema: string, resolver: string) => solidityKeccak256(['bytes', 'address'], [schema, resolver]);

  describe('construction', () => {
    it('should report a version', async () => {
      expect(await registry.VERSION()).to.equal('0.11');
    });

    it('should initialize without any Ss', async () => {
      expect(await registry.getSchemaCount()).to.equal(0);
    });
  });

  describe('registration', () => {
    const testRegister = async (schema: string, resolver: string | SignerWithAddress) => {
      const resolverAddress = typeof resolver === 'string' ? resolver : resolver.address;

      const uuid = getUUID(schema, resolverAddress);
      const index = (await registry.getSchemaCount()).add(1);

      const retUUID = await registry.callStatic.register(schema, resolverAddress);
      const res = await registry.register(schema, resolverAddress);
      expect(retUUID).to.equal(uuid);
      await expect(res).to.emit(registry, 'Registered').withArgs(uuid, index, schema, resolverAddress, sender.address);
      expect(await registry.getSchemaCount()).to.equal(index);

      const SchemaRecord = await registry.getSchema(uuid);
      expect(SchemaRecord.uuid).to.equal(uuid);
      expect(SchemaRecord.index).to.equal(index);
      expect(SchemaRecord.schema).to.equal(schema);
      expect(SchemaRecord.resolver).to.equal(resolverAddress);
    };

    it('should allow to register an schema without a schema', async () => {
      await testRegister(ZERO_BYTES, accounts[3]);
    });

    it('should allow to register an schema without a resolver', async () => {
      await testRegister('0x1234', ZERO_ADDRESS);
    });

    it('should allow to register an schema without neither a schema or a resolver', async () => {
      await testRegister(ZERO_BYTES, ZERO_ADDRESS);
    });

    it('should not allow to register the same schema and resolver twice', async () => {
      await testRegister('0x1234', ZERO_ADDRESS);
      await expect(testRegister('0x1234', ZERO_ADDRESS)).to.be.revertedWith('AlreadyExists');
    });
  });

  describe('schema querying', () => {
    it('should return a schema', async () => {
      const schema = '0x1234';
      const resolver = accounts[5];

      await registry.register(schema, resolver.address);

      const uuid = getUUID(schema, resolver.address);
      const SchemaRecord = await registry.getSchema(uuid);
      expect(SchemaRecord.uuid).to.equal(uuid);
      expect(SchemaRecord.index).to.equal(1);
      expect(SchemaRecord.schema).to.equal(schema);
      expect(SchemaRecord.resolver).to.equal(resolver.address);
    });

    it('should return an empty schema given non-existing id', async () => {
      const SchemaRecord = await registry.getSchema(formatBytes32String('BAD'));
      expect(SchemaRecord.uuid).to.equal(ZERO_BYTES32);
      expect(SchemaRecord.index).to.equal(0);
      expect(SchemaRecord.schema).to.equal(ZERO_BYTES);
      expect(SchemaRecord.resolver).to.equal(ZERO_ADDRESS);
    });
  });
});
