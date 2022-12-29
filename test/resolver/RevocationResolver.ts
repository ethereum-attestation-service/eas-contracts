import Contracts from '../../components/Contracts';
import { RevocationResolver, SchemaRegistry, TestEAS } from '../../typechain-types';
import { ZERO_BYTES32 } from '../../utils/Constants';
import {
  expectFailedMultiRevocations,
  expectFailedRevocation,
  expectMultiRevocations,
  expectRevocation,
  getUUIDFromAttestTx,
  registerSchema
} from '../helpers/EAS';
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
  let eas: TestEAS;
  let resolver: RevocationResolver;
  let uuid: string;
  let uuids: string[] = [];

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
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
    eas = await Contracts.TestEAS.deploy(registry.address);

    await eas.setTime(await latest());

    resolver = await Contracts.RevocationResolver.deploy(eas.address);
    expect(await resolver.isPayable()).to.be.false;

    schemaId = await registerSchema(schema, registry, resolver, true);

    uuid = await getUUIDFromAttestTx(
      eas.connect(sender).attest({
        schema: schemaId,
        data: {
          recipient: recipient.address,
          expirationTime,
          revocable: true,
          refUUID: ZERO_BYTES32,
          data,
          value: 0
        }
      })
    );

    uuids = [];

    for (let i = 0; i < 2; i++) {
      uuids.push(
        await getUUIDFromAttestTx(
          eas.connect(sender).attest({
            schema: schemaId,
            data: {
              recipient: recipient.address,
              expirationTime,
              revocable: true,
              refUUID: ZERO_BYTES32,
              data,
              value: 0
            }
          })
        )
      );
    }
  });

  context('when revocations are allowed', () => {
    beforeEach(async () => {
      resolver.setRevocation(true);
    });

    it('should allow revoking an existing attestation', async () => {
      await expectRevocation({ eas }, schemaId, { uuid }, { from: sender });

      await expectMultiRevocations({ eas }, [{ schema: schemaId, requests: uuids.map((uuid) => ({ uuid })) }], {
        from: sender
      });
    });
  });

  context('when revocations are not allowed', () => {
    beforeEach(async () => {
      resolver.setRevocation(false);
    });

    it('should revert when attempting to revoke an existing attestation', async () => {
      await expectFailedRevocation({ eas }, schemaId, { uuid }, { from: sender }, 'InvalidRevocation');

      await expectFailedMultiRevocations(
        { eas },
        [{ schema: schemaId, requests: uuids.map((uuid) => ({ uuid })) }],
        { from: sender },
        'InvalidRevocation'
      );
    });
  });
});
