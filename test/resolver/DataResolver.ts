import { expect } from 'chai';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../../components/Contracts';
import { SchemaRegistry, TestEAS } from '../../typechain-types';
import { NO_EXPIRATION } from '../../utils/Constants';
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

describe('DataResolver', () => {
  let accounts: Signer[];
  let recipient: Signer;
  let sender: Signer;

  let registry: SchemaRegistry;
  let eas: TestEAS;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
  const expirationTime = NO_EXPIRATION;

  const DATA1 = '0x00';
  const DATA2 = '0x01';

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(await registry.getAddress());

    await eas.setTime(await latest());

    const resolver = await Contracts.DataResolver.deploy(await eas.getAddress());
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should revert when attesting with wrong data', async () => {
    await expectFailedAttestation(
      {
        eas
      },
      schemaId,
      {
        recipient: await recipient.getAddress(),
        expirationTime,
        data: '0x1234'
      },
      { from: sender },
      'InvalidAttestation'
    );

    await expectFailedAttestation(
      {
        eas
      },
      schemaId,
      {
        recipient: await recipient.getAddress(),
        expirationTime,
        data: '0x02'
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
              expirationTime,
              data: '0x02'
            },
            {
              recipient: await recipient.getAddress(),
              expirationTime,
              data: DATA1
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
              data: DATA2
            },
            {
              recipient: await recipient.getAddress(),
              expirationTime,
              data: '0x02'
            }
          ]
        }
      ],
      { from: sender },
      'InvalidAttestations'
    );
  });

  it('should allow attesting with correct data', async () => {
    const { uid } = await expectAttestation(
      {
        eas
      },
      schemaId,
      {
        recipient: await recipient.getAddress(),
        expirationTime,
        data: DATA1
      },
      {
        from: sender
      }
    );

    await expectRevocation({ eas }, schemaId, { uid }, { from: sender });

    const { uid: uid2 } = await expectAttestation(
      {
        eas
      },
      schemaId,
      {
        recipient: await recipient.getAddress(),
        expirationTime,
        data: DATA2
      },
      {
        from: sender
      }
    );

    await expectRevocation({ eas }, schemaId, { uid: uid2 }, { from: sender });

    const res = await expectMultiAttestations(
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
              data: DATA1
            },
            {
              recipient: await recipient.getAddress(),
              expirationTime,
              data: DATA2
            }
          ]
        }
      ],
      {
        from: sender
      }
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
});
