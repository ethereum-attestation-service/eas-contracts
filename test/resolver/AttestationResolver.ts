import Contracts from '../../components/Contracts';
import { AttestationResolver, EIP712Verifier, SchemaRegistry, TestEAS } from '../../typechain-types';
import { ZERO_ADDRESS, ZERO_BYTES32 } from '../../utils/Constants';
import {
  expectAttestation,
  expectFailedAttestation,
  expectRevocation,
  getSchemaUUID,
  getUUIDFromAttestTx,
  registerSchema
} from '../helpers/EAS';
import { latest } from '../helpers/Time';
import { createWallet } from '../helpers/Wallet';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

describe('AttestationResolver', () => {
  let accounts: SignerWithAddress[];
  let recipient: SignerWithAddress;
  let sender: Wallet;

  let registry: SchemaRegistry;
  let verifier: EIP712Verifier;
  let eas: TestEAS;
  let resolver: AttestationResolver;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
  const expirationTime = 0;
  const data = '0x1234';

  const schema2 = 'bool isFriend';
  const schema2Id = getSchemaUUID(schema2, ZERO_ADDRESS, true);
  let uuid: string;

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

    await registerSchema(schema2, registry, ZERO_ADDRESS, true);

    uuid = await getUUIDFromAttestTx(
      eas.attest(recipient.address, schema2Id, expirationTime, true, ZERO_BYTES32, data, 0)
    );

    resolver = await Contracts.AttestationResolver.deploy(eas.address);
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should revert when attesting to a non-existing attestation', async () => {
    await expectFailedAttestation(
      eas,
      recipient.address,
      schemaId,
      expirationTime,
      true,
      ZERO_BYTES32,
      ZERO_BYTES32,
      0,
      'InvalidAttestation',
      { from: sender }
    );
  });

  it('should allow attesting to an existing attestation', async () => {
    const { uuid: uuid2 } = await expectAttestation(
      eas,
      recipient.address,
      schemaId,
      expirationTime,
      true,
      ZERO_BYTES32,
      uuid,
      0,
      {
        from: sender
      }
    );

    await expectRevocation(eas, uuid2, 0, { from: sender });
  });

  it('should revert invalid input', async () => {
    await expect(resolver.toBytes32(data, 1000)).to.be.revertedWith('OutOfBounds');
  });
});
