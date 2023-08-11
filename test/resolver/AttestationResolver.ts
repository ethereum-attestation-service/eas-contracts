import { expect } from 'chai';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../../components/Contracts';
import { AttestationResolver, SchemaRegistry, TestEAS } from '../../typechain-types';
import { NO_EXPIRATION, ZERO_ADDRESS, ZERO_BYTES32 } from '../../utils/Constants';
import { getSchemaUID, getUIDFromAttestTx } from '../../utils/EAS';
import {
  expectAttestation,
  expectFailedAttestation,
  expectFailedMultiAttestations,
  expectMultiAttestations,
  expectMultiRevocations,
  expectRevocation,
  registerSchema
} from '../helpers/EAS';
import { latest } from '../helpers/Time';
import { createWallet } from '../helpers/Wallet';

describe('AttestationResolver', () => {
  let accounts: Signer[];
  let recipient: Signer;
  let sender: Signer;

  let registry: SchemaRegistry;
  let eas: TestEAS;
  let resolver: AttestationResolver;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
  const expirationTime = NO_EXPIRATION;
  const data = '0x1234';

  const schema2 = 'bool isFriend';
  const schema2Id = getSchemaUID(schema2, ZERO_ADDRESS, true);
  let uid: string;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(registry.getAddress());

    await eas.setTime(await latest());

    await registerSchema(schema2, registry, ZERO_ADDRESS, true);

    uid = await getUIDFromAttestTx(
      eas.attest({
        schema: schema2Id,
        data: {
          recipient: await recipient.getAddress(),
          expirationTime,
          revocable: true,
          refUID: ZERO_BYTES32,
          data,
          value: 0
        }
      })
    );

    resolver = await Contracts.AttestationResolver.deploy(eas.getAddress());
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should revert when attesting to non-existing attestations', async () => {
    await expectFailedAttestation(
      {
        eas
      },
      schemaId,
      {
        recipient: await recipient.getAddress(),
        expirationTime
      },
      { from: sender },
      'InvalidAttestation'
    );

    await expectFailedMultiAttestations(
      {
        eas
      },
      [
        {
          schema: schemaId,
          requests: [
            {
              recipient: await recipient.getAddress(),
              expirationTime
            },
            {
              recipient: await recipient.getAddress(),
              expirationTime,
              data: uid
            }
          ]
        }
      ],
      { from: sender },
      'InvalidAttestations'
    );

    await expectFailedMultiAttestations(
      {
        eas
      },
      [
        {
          schema: schemaId,
          requests: [
            {
              recipient: await recipient.getAddress(),
              expirationTime,
              data: uid
            },
            {
              recipient: await recipient.getAddress(),
              expirationTime
            }
          ]
        }
      ],
      { from: sender },
      'InvalidAttestations'
    );
  });

  it('should allow attesting to an existing attestation', async () => {
    const { uid: uid2 } = await expectAttestation(
      { eas },
      schemaId,
      { recipient: await recipient.getAddress(), expirationTime, data: uid },
      { from: sender }
    );

    await expectRevocation({ eas }, schemaId, { uid: uid2 }, { from: sender });

    const res = await expectMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: await recipient.getAddress(), expirationTime, data: uid },
            { recipient: await recipient.getAddress(), expirationTime, data: uid }
          ]
        }
      ],
      { from: sender }
    );

    await expectMultiRevocations(
      { eas },
      [
        {
          schema: schemaId,
          requests: res.uids.map((uid) => ({ uid }))
        }
      ],
      { from: sender }
    );
  });

  it('should revert on invalid input', async () => {
    await expect(resolver.toBytes32(data, 1000)).to.be.revertedWithCustomError(resolver, 'OutOfBounds');
  });
});
