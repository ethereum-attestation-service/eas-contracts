import Contracts from '../components/Contracts';
import { SchemaRegistry } from '../typechain-types';
import { ZERO_ADDRESS, ZERO_BYTES, ZERO_BYTES32 } from '../utils/Constants';
import { getSchemaUID } from '../utils/EAS';
import { expect } from './helpers/Chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { encodeBytes32String } from 'ethers';
import { ethers } from 'hardhat';

describe('SchemaRegistry', () => {
  let accounts: HardhatEthersSigner[];

  let registry: SchemaRegistry;

  before(async () => {
    accounts = await ethers.getSigners();
  });

  beforeEach(async () => {
    registry = await Contracts.SchemaRegistry.deploy();
  });

  describe('construction', () => {
    it('should report a version', async () => {
      expect(await registry.version()).to.equal('1.0.0');
    });
  });

  describe('registration', () => {
    const testRegister = async (schema: string, resolver: string | HardhatEthersSigner, revocable: boolean) => {
      const resolverAddress = typeof resolver === 'string' ? resolver : resolver.address;

      const uid = getSchemaUID(schema, resolverAddress, revocable);

      const retUID = await registry.register.staticCall(schema, resolverAddress, revocable);
      await registry.register(schema, resolverAddress, revocable);
      expect(retUID).to.equal(uid);
      // TODO: restore the test as soon as hardhat-waffle supports ethers v6
      // const sender = accounts[0];
      // await expect(res).to.emit(registry, 'Registered').withArgs(uid, sender.address);

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
      await testRegister('bool isFriend', ZERO_ADDRESS, true);
      await expect(testRegister('bool isFriend', ZERO_ADDRESS, true)).to.be.revertedWith('AlreadyExists');
    });
  });

  describe('schema querying', () => {
    it('should return a schema', async () => {
      const schema = 'bool isFriend';
      const resolver = accounts[5];

      await registry.register(schema, resolver.address, true);

      const uid = getSchemaUID(schema, resolver.address, true);
      const schemaRecord = await registry.getSchema(uid);
      expect(schemaRecord.uid).to.equal(uid);
      expect(schemaRecord.schema).to.equal(schema);
      expect(schemaRecord.resolver).to.equal(resolver.address);
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
