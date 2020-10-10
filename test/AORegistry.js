const { expect } = require('chai');
const { BN, constants, expectEvent } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const AORegistry = require('./helpers/aoRegistry');

contract('AORegistry', (accounts) => {
  const ZERO_BYTES = '0x00';
  const EVENTS = AORegistry.getEvents();

  let registry;

  beforeEach(async () => {
    registry = await AORegistry.new();
  });

  describe('construction', async () => {
    it('should report a version', async () => {
      expect(await registry.getVersion()).to.eql('0.1');
    });

    it('should initialize without any AOs', async () => {
      expect(await registry.getAOCount()).to.be.bignumber.equal(new BN(0));
    });
  });

  describe('registration', async () => {
    const sender = accounts[0];

    const testRegister = async (schema, verifier) => {
      const prevAOCount = await registry.getAOCount();
      const id = prevAOCount.add(new BN(1));

      const res = await registry.register(schema, verifier);
      expectEvent(res, EVENTS.registered, {
        _id: id,
        _schema: schema,
        _verifier: verifier,
        _from: sender
      });

      expect(await registry.getAOCount()).to.be.bignumber.equal(id);

      const ao = await registry.getAO(id);
      expect(ao.id).to.be.bignumber.equal(id);
      expect(ao.schema).to.eql(schema);
      expect(ao.verifier).to.eql(verifier);
    };

    it('should allow to register an AO without a schema', async () => {
      await testRegister(ZERO_BYTES, accounts[3]);
    });

    it('should allow to register an AO without a verifier', async () => {
      await testRegister('0x1234', ZERO_ADDRESS);
    });

    it('should allow to register an AO without neither a schema or a verifier', async () => {
      await testRegister(ZERO_BYTES, ZERO_ADDRESS);
    });
  });

  describe('AO querying', async () => {
    it('should return an AO', async () => {
      const schema = '0x1234';
      const verifier = accounts[5];

      await registry.register(schema, verifier);

      const id = new BN(1);
      const ao = await registry.getAO(id);
      expect(ao.id).to.be.bignumber.equal(id);
      expect(ao.schema).to.eql(schema);
      expect(ao.verifier).to.eql(verifier);
    });

    it('should return an empty AO given non-existing id', async () => {
      const ao = await registry.getAO(new BN(10000));
      expect(ao.id).to.be.bignumber.equal(new BN(0));
      expect(ao.schema).to.be.null();
      expect(ao.verifier).to.eql(ZERO_ADDRESS);
    });
  });
});
