import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import Contracts from 'components/Contracts';
import { AORegistry } from 'typechain';

const {
  constants: { AddressZero }
} = ethers;

const ZERO_BYTES = '0x00';

let accounts: SignerWithAddress[];
let sender: SignerWithAddress;

let registry: AORegistry;

describe('AORegistry', () => {
  before(async () => {
    accounts = await ethers.getSigners();

    [sender] = accounts;
  });

  beforeEach(async () => {
    registry = await Contracts.AORegistry.deploy();
  });

  describe('construction', async () => {
    it('should report a version', async () => {
      expect(await registry.VERSION()).to.equal('0.2');
    });

    it('should initialize without any AOs', async () => {
      expect(await registry.getAOCount()).to.equal(BigNumber.from(0));
    });
  });

  describe('registration', async () => {
    const testRegister = async (schema: string, verifier: string | SignerWithAddress) => {
      const prevAOCount = await registry.getAOCount();
      const id = prevAOCount.add(BigNumber.from(1));

      const verifierAddress = typeof verifier === 'string' ? verifier : verifier.address;
      const retId = await registry.callStatic.register(schema, verifierAddress);
      const res = await registry.register(schema, verifierAddress);
      expect(retId).to.equal(id);
      await expect(res).to.emit(registry, 'Registered').withArgs(id, schema, verifierAddress, sender.address);

      expect(await registry.getAOCount()).to.equal(id);

      const ao = await registry.getAO(id);
      expect(ao[0]).to.equal(id);
      expect(ao[1]).to.equal(schema);
      expect(ao[2]).to.equal(verifierAddress);
    };

    it('should allow to register an AO without a schema', async () => {
      await testRegister(ZERO_BYTES, accounts[3]);
    });

    it('should allow to register an AO without a verifier', async () => {
      await testRegister('0x1234', AddressZero);
    });

    it('should allow to register an AO without neither a schema or a verifier', async () => {
      await testRegister(ZERO_BYTES, AddressZero);
    });
  });

  describe('AO querying', async () => {
    it('should return an AO', async () => {
      const schema = '0x1234';
      const verifier = accounts[5];

      await registry.register(schema, verifier.address);

      const id = BigNumber.from(1);
      const ao = await registry.getAO(id);
      expect(ao[0]).to.equal(id);
      expect(ao[1]).to.equal(schema);
      expect(ao[2]).to.equal(verifier.address);
    });

    it('should return an empty AO given non-existing id', async () => {
      const ao = await registry.getAO(BigNumber.from(10000));
      expect(ao[0]).to.equal(BigNumber.from(0));
      expect(ao[1]).to.equal('0x');
      expect(ao[2]).to.equal(AddressZero);
    });
  });
});
