import { encodeBytes32String, Signer } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../components/Contracts';
import { SchemaRegistry } from '../typechain-types';
import { ZERO_ADDRESS, ZERO_BYTES, ZERO_BYTES32 } from '../utils/Constants';
import { getSchemaUID } from '../utils/EAS';
import { expect } from './helpers/Chai';

describe('SchemaRegistry', () => {
  let accounts: Signer[];

  let registry: SchemaRegistry;

  before(async () => {
    accounts = await ethers.getSigners();
  });

  beforeEach(async () => {
    registry = await Contracts.SchemaRegistry.deploy();
  });

  describe('construction', () => {
    it('should report a version', async () => {
      expect(await registry.version()).to.equal('1.1.0');
    });
  });

  describe('registration', () => {
    const testRegister = async (schema: string, resolver: string | Signer, revocable: boolean) => {
      const resolverAddress = typeof resolver === 'string' ? resolver : await resolver.getAddress();

      const uid = getSchemaUID(schema, resolverAddress, revocable);

      const retUID = await registry.register.staticCall(schema, resolverAddress, revocable);
      const res = await registry.register(schema, resolverAddress, revocable);
      expect(retUID).to.equal(uid);

      const sender = accounts[0];
      await expect(res)
        .to.emit(registry, 'Registered')
        .withArgs(uid, await sender.getAddress());

      const schemaRecord = await registry.getSchema(uid);
      expect(schemaRecord.uid).to.equal(uid);
      expect(schemaRecord.schema).to.equal(schema);
      expect(schemaRecord.resolver).to.equal(resolverAddress);
      expect(schemaRecord.revocable).to.equal(revocable);
    };

    it('should allow to register a schema', async () => {
      await testRegister('bool like', accounts[3], true);
      await testRegister('bytes32 proposalId, bool vote', accounts[3], false);
    });

    it('should allow to register a schema without a schema', async () => {
      await testRegister(ZERO_BYTES, accounts[3], true);
    });

    it('should allow to register a schema without a resolver', async () => {
      await testRegister('bool hasPhoneNumber, bytes32 phoneHash', ZERO_ADDRESS, true);
    });

    it('should allow to register a schema without neither a schema or a resolver', async () => {
      await testRegister(ZERO_BYTES, ZERO_ADDRESS, true);
    });

    it('should not allow to register the same schema and resolver twice', async () => {
      const schema = 'bool isFriend';
      await registry.register(schema, ZERO_ADDRESS, true);
      await expect(registry.register(schema, ZERO_ADDRESS, true)).to.be.revertedWithCustomError(
        registry,
        'AlreadyExists'
      );
    });
  });

  describe('schema querying', () => {
    it('should return a schema', async () => {
      const schema = 'bool isFriend';
      const resolver = accounts[5];

      await registry.register(schema, await resolver.getAddress(), true);

      const uid = getSchemaUID(schema, await resolver.getAddress(), true);
      const schemaRecord = await registry.getSchema(uid);
      expect(schemaRecord.uid).to.equal(uid);
      expect(schemaRecord.schema).to.equal(schema);
      expect(schemaRecord.resolver).to.equal(await resolver.getAddress());
      expect(schemaRecord.revocable).to.equal(true);
    });

    it('should return an empty schema given non-existing id', async () => {
      const schemaRecord = await registry.getSchema(encodeBytes32String('BAD'));
      expect(schemaRecord.uid).to.equal(ZERO_BYTES32);
      expect(schemaRecord.schema).to.equal('');
      expect(schemaRecord.resolver).to.equal(ZERO_ADDRESS);
      expect(schemaRecord.revocable).to.equal(false);
    });
  });
});
