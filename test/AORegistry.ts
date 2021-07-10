import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import Contracts from 'components/Contracts';
import { AORegistry } from 'typechain';

const {
  constants: { AddressZero },
  utils: { solidityKeccak256, formatBytes32String }
} = ethers;

const ZERO_BYTES = '0x';
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

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

  const getUUID = (schema: string, verifier: string) => solidityKeccak256(['bytes', 'address'], [schema, verifier]);

  describe('construction', async () => {
    it('should report a version', async () => {
      expect(await registry.VERSION()).to.equal('0.3');
    });

    it('should initialize without any AOs', async () => {
      expect(await registry.getAOCount()).to.equal(BigNumber.from(0));
    });
  });

  describe('registration', async () => {
    const testRegister = async (schema: string, verifier: string | SignerWithAddress) => {
      const verifierAddress = typeof verifier === 'string' ? verifier : verifier.address;

      const uuid = getUUID(schema, verifierAddress);
      const index = (await registry.getAOCount()).add(BigNumber.from(1));

      const retUUID = await registry.callStatic.register(schema, verifierAddress);
      const res = await registry.register(schema, verifierAddress);
      expect(retUUID).to.equal(uuid);
      await expect(res).to.emit(registry, 'Registered').withArgs(uuid, index, schema, verifierAddress, sender.address);
      expect(await registry.getAOCount()).to.equal(index);

      const ao = await registry.getAO(uuid);
      expect(ao[0]).to.equal(uuid);
      expect(ao[1]).to.equal(index);
      expect(ao[2]).to.equal(schema);
      expect(ao[3]).to.equal(verifierAddress);
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

    it('should not allow to register the same schema and verifier twice', async () => {
      await testRegister('0x1234', AddressZero);
      await expect(testRegister('0x1234', AddressZero)).to.be.revertedWith('ERR_ALREADY_EXISTS');
    });
  });

  describe('AO querying', async () => {
    it('should return an AO', async () => {
      const schema = '0x1234';
      const verifier = accounts[5];

      await registry.register(schema, verifier.address);

      const uuid = getUUID(schema, verifier.address);
      const ao = await registry.getAO(uuid);
      expect(ao[0]).to.equal(uuid);
      expect(ao[1]).to.equal(BigNumber.from(1));
      expect(ao[2]).to.equal(schema);
      expect(ao[3]).to.equal(verifier.address);
    });

    it('should return an empty AO given non-existing id', async () => {
      const ao = await registry.getAO(formatBytes32String('BAD'));
      expect(ao[0]).to.equal(ZERO_BYTES32);
      expect(ao[1]).to.equal(BigNumber.from(0));
      expect(ao[2]).to.equal(ZERO_BYTES);
      expect(ao[3]).to.equal(AddressZero);
    });
  });
});
