import Contracts from '../../components/Contracts';
import { EIP712Verifier, SchemaRegistry, TestEAS } from '../../typechain-types';
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
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

describe('DataResolver', () => {
  let accounts: SignerWithAddress[];
  let recipient: SignerWithAddress;
  let sender: Wallet;

  let registry: SchemaRegistry;
  let verifier: EIP712Verifier;
  let eas: TestEAS;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
  const expirationTime = 0;

  const DATA1 = '0x00';
  const DATA2 = '0x01';

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

    const resolver = await Contracts.DataResolver.deploy(eas.address);
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
        recipient: recipient.address,
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
        recipient: recipient.address,
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
              recipient: recipient.address,
              expirationTime,
              data: '0x02'
            },
            {
              recipient: recipient.address,
              expirationTime,
              data: DATA1
            }
          ]
        }
      ],
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
              recipient: recipient.address,
              expirationTime,
              data: DATA2
            },
            {
              recipient: recipient.address,
              expirationTime,
              data: '0x02'
            }
          ]
        }
      ],
      { from: sender },
      'InvalidAttestation'
    );
  });

  it('should allow attesting with correct data', async () => {
    const { uuid } = await expectAttestation(
      {
        eas
      },
      schemaId,
      {
        recipient: recipient.address,
        expirationTime,
        data: DATA1
      },
      {
        from: sender
      }
    );

    await expectRevocation({ eas }, schemaId, { uuid }, { from: sender });

    const { uuid: uuid2 } = await expectAttestation(
      {
        eas
      },
      schemaId,
      {
        recipient: recipient.address,
        expirationTime,
        data: DATA2
      },
      {
        from: sender
      }
    );

    await expectRevocation({ eas }, schemaId, { uuid: uuid2 }, { from: sender });

    const res = await expectMultiAttestations(
      {
        eas
      },
      [
        {
          schema: schemaId,
          requests: [
            {
              recipient: recipient.address,
              expirationTime,
              data: DATA1
            },
            {
              recipient: recipient.address,
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
          requests: res.uuids.map((uuid) => ({ uuid }))
        }
      ],
      { from: sender }
    );
  });
});
