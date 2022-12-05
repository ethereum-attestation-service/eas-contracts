import Contracts from '../components/Contracts';
import { EIP712Verifier } from '../typechain-types';
import { EIP712Utils } from './helpers/EIP712Utils';
import { expect } from 'chai';
import { ethers } from 'hardhat';

const {
  utils: { keccak256, toUtf8Bytes }
} = ethers;

const ATTEST_TYPED_SIGNATURE =
  'Attest(address recipient,bytes32 schema,uint32 expirationTime,bool revocable,bytes32 refUUID,bytes data,uint256 nonce)';
const REVOKE_TYPED_SIGNATURE = 'Revoke(bytes32 uuid,uint256 nonce)';

describe('EIP712Verifier', () => {
  let verifier: EIP712Verifier;

  beforeEach(async () => {
    verifier = await Contracts.EIP712Verifier.deploy();
  });

  it('should report a version', async () => {
    expect(await verifier.VERSION()).to.equal('0.18');
  });

  it('should return the correct domain separator', async () => {
    const utils = await EIP712Utils.fromVerifier(verifier);

    expect(await verifier.getDomainSeparator()).to.equal(utils.getDomainSeparator());
  });

  it('should return the attest type hash', async () => {
    expect(await verifier.getAttestTypeHash()).to.equal(keccak256(toUtf8Bytes(ATTEST_TYPED_SIGNATURE)));
  });

  it('should return the revoke type hash', async () => {
    expect(await verifier.getRevokeTypeHash()).to.equal(keccak256(toUtf8Bytes(REVOKE_TYPED_SIGNATURE)));
  });
});
