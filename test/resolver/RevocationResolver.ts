import Contracts from '../../components/Contracts';
import { EIP712Verifier, RevocationResolver, SchemaRegistry, TestEAS } from '../../typechain-types';
import { ZERO_BYTES32 } from '../../utils/Constants';
import { expectFailedRevocation, expectRevocation, getUUIDFromAttestTx, registerSchema } from '../helpers/EAS';
import { latest } from '../helpers/Time';
import { createWallet } from '../helpers/Wallet';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

describe('RevocationResolver', () => {
  let accounts: SignerWithAddress[];
  let recipient: SignerWithAddress;
  let sender: Wallet;

  let registry: SchemaRegistry;
  let verifier: EIP712Verifier;
  let eas: TestEAS;
  let resolver: RevocationResolver;
  let uuid: string;

  const schema = 'S';
  let schemaId: string;
  const data = '0x1234';
  const expirationTime = 0;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    verifier = await Contracts.EIP712Verifier.deploy();
    eas = await Contracts.TestEAS.deploy(registry.address, verifier.address);

    await eas.setTime(await latest());

    resolver = await Contracts.RevocationResolver.deploy(eas.address);
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver);

    uuid = await getUUIDFromAttestTx(
      eas.connect(sender).attest(recipient.address, schemaId, expirationTime, ZERO_BYTES32, data)
    );
  });

  context('when revocations are allowed', () => {
    beforeEach(async () => {
      resolver.setRevocation(true);
    });

    it('should allow revoking an existing attestation', async () => {
      await expectRevocation(eas, uuid, { from: sender });
    });
  });

  context('when revocations are not allowed', () => {
    beforeEach(async () => {
      resolver.setRevocation(false);
    });

    it('should revert when attempting to revoke an existing attestation', async () => {
      await expectFailedRevocation(eas, uuid, 'InvalidRevocation', { from: sender });
    });
  });
});
