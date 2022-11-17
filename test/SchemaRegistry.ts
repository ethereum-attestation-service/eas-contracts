import Contracts from '../components/Contracts';
import { SchemaRegistry } from '../typechain-types';
import { ZERO_ADDRESS, ZERO_BYTES, ZERO_BYTES32 } from '../utils/Constants';
import { getSchemaUUID } from './helpers/EAS';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

const {
  utils: { formatBytes32String }
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

  describe('construction', () => {
    it('should report a version', async () => {
      expect(await registry.VERSION()).to.equal('0.15');
    });
  });

  describe('registration', () => {
    const testRegister = async (schema: string, resolver: string | SignerWithAddress) => {
      const resolverAddress = typeof resolver === 'string' ? resolver : resolver.address;

      const uuid = getSchemaUUID(schema, resolverAddress);

      const retUUID = await registry.callStatic.register(schema, resolverAddress);
      const res = await registry.register(schema, resolverAddress);
      expect(retUUID).to.equal(uuid);
      await expect(res).to.emit(registry, 'Registered').withArgs(uuid, sender.address);

      const schemaRecord = await registry.getSchema(uuid);
      expect(schemaRecord.uuid).to.equal(uuid);
      expect(schemaRecord.schema).to.equal(schema);
      expect(schemaRecord.resolver).to.equal(resolverAddress);
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

      const uuid = getSchemaUUID(schema, resolver.address);
      const schemaRecord = await registry.getSchema(uuid);
      expect(schemaRecord.uuid).to.equal(uuid);
      expect(schemaRecord.schema).to.equal(schema);
      expect(schemaRecord.resolver).to.equal(resolver.address);
    });

    it('should return an empty schema given non-existing id', async () => {
      const schemaRecord = await registry.getSchema(formatBytes32String('BAD'));
      expect(schemaRecord.uuid).to.equal(ZERO_BYTES32);
      expect(schemaRecord.schema).to.equal('');
      expect(schemaRecord.resolver).to.equal(ZERO_ADDRESS);
    });
  });
});
