import { encodeBytes32String, Signer } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../components/Contracts';
import { EAS, Indexer, SchemaRegistry } from '../typechain-types';
import { NO_EXPIRATION, ZERO_ADDRESS, ZERO_BYTES, ZERO_BYTES32 } from '../utils/Constants';
import { getSchemaUID, getUIDFromAttestTx } from '../utils/EAS';
import { expect } from './helpers/Chai';

describe('Indexer', () => {
  let accounts: Signer[];
  let sender: Signer;
  let recipient: Signer;

  let registry: SchemaRegistry;
  let eas: EAS;
  let indexer: Indexer;

  before(async () => {
    accounts = await ethers.getSigners();

    [sender, recipient] = accounts;
  });

  beforeEach(async () => {
    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.EAS.deploy(await registry.getAddress());

    indexer = await Contracts.Indexer.deploy(await eas.getAddress());
  });

  describe('construction', () => {
    it('should revert when initialized with an empty EAS', async () => {
      await expect(Contracts.Indexer.deploy(ZERO_ADDRESS)).to.be.revertedWithCustomError(indexer, 'InvalidEAS');
    });

    it('should be properly initialized', async () => {
      expect(await indexer.version()).to.equal('1.3.0');

      expect(await indexer.getEAS()).to.equal(await eas.getAddress());
    });
  });

  describe('indexing', () => {
    context('without any attestations', () => {
      it('should revert when attempting to index a non-existing attestation', async () => {
        await expect(indexer.indexAttestation(encodeBytes32String('BAD'))).to.be.revertedWithCustomError(
          indexer,
          'InvalidAttestation'
        );
      });

      it('should revert when attempting to index multiple non-existing attestation', async () => {
        await expect(
          indexer.indexAttestations([encodeBytes32String('BAD1'), encodeBytes32String('BAD2')])
        ).to.be.revertedWithCustomError(indexer, 'InvalidAttestation');
      });
    });

    context('with attestations', () => {
      const schema = 'bool liked';
      const schemaId = getSchemaUID(schema, ZERO_ADDRESS, true);
      let uids: string[] = [];

      beforeEach(async () => {
        await registry.register(schema, ZERO_ADDRESS, true);
      });

      beforeEach(async () => {
        uids = [];

        for (let i = 0; i < 3; i++) {
          const res = await eas.connect(sender).attest({
            schema: schemaId,
            data: {
              recipient,
              expirationTime: NO_EXPIRATION,
              revocable: true,
              refUID: ZERO_BYTES32,
              data: ZERO_BYTES,
              value: 0n
            }
          });

          uids.push(await getUIDFromAttestTx(res));
        }
      });

      interface UIDInfo {
        receivedAttestationsCount: bigint;
        receivedAttestations: string[];
        receivedAttestationsReversed: string[];
        sentAttestationsCount: bigint;
        sentAttestations: string[];
        sentAttestationsReversed: string[];
        schemaAttesterRecipientAttestationCount: bigint;
        schemaAttesterRecipientAttestations: string[];
        schemaAttesterRecipientAttestationsReversed: string[];
        schemaAttestationUIDCount: bigint;
        schemaAttestationUIDs: string[];
        schemaAttestationUIDsReversed: string[];
      }

      const expectIndexedAttestations = async (uids: string[]) => {
        const infos: Record<string, UIDInfo> = {};

        for (const uid of uids) {
          const info: UIDInfo = {
            receivedAttestationsCount: 0n,
            receivedAttestations: [],
            receivedAttestationsReversed: [],
            sentAttestationsCount: 0n,
            sentAttestations: [],
            sentAttestationsReversed: [],
            schemaAttesterRecipientAttestationCount: 0n,
            schemaAttesterRecipientAttestations: [],
            schemaAttesterRecipientAttestationsReversed: [],
            schemaAttestationUIDCount: 0n,
            schemaAttestationUIDs: [],
            schemaAttestationUIDsReversed: []
          };

          expect(await indexer.isAttestationIndexed(uid)).to.be.false;

          info.receivedAttestationsCount = await indexer.getReceivedAttestationUIDCount(
            await recipient.getAddress(),
            schemaId
          );
          info.receivedAttestations = await indexer.getReceivedAttestationUIDs(
            await recipient.getAddress(),
            schemaId,
            0,
            info.receivedAttestationsCount,
            false
          );
          info.receivedAttestationsReversed = await indexer.getReceivedAttestationUIDs(
            await recipient.getAddress(),
            schemaId,
            0,
            info.receivedAttestationsCount,
            true
          );

          expect(info.receivedAttestations).not.to.include(uid);
          expect(info.receivedAttestationsReversed).not.to.include(uid);

          info.sentAttestationsCount = await indexer.getSentAttestationUIDCount(await sender.getAddress(), schemaId);
          info.sentAttestations = await indexer.getSentAttestationUIDs(
            await sender.getAddress(),
            schemaId,
            0,
            info.sentAttestationsCount,
            false
          );
          info.sentAttestationsReversed = await indexer.getSentAttestationUIDs(
            await sender.getAddress(),
            schemaId,
            0,
            info.sentAttestationsCount,
            true
          );

          expect(info.sentAttestations).not.to.include(uid);
          expect(info.sentAttestationsReversed).not.to.include(uid);

          info.schemaAttesterRecipientAttestationCount = await indexer.getSchemaAttesterRecipientAttestationUIDCount(
            schemaId,
            await sender.getAddress(),
            await recipient.getAddress()
          );
          info.schemaAttesterRecipientAttestations = await indexer.getSchemaAttesterRecipientAttestationUIDs(
            schemaId,
            await sender.getAddress(),
            await recipient.getAddress(),
            0,
            info.schemaAttesterRecipientAttestationCount,
            false
          );
          info.schemaAttesterRecipientAttestationsReversed = await indexer.getSchemaAttesterRecipientAttestationUIDs(
            schemaId,
            await sender.getAddress(),
            await recipient.getAddress(),
            0,
            info.schemaAttesterRecipientAttestationCount,
            true
          );

          expect(info.schemaAttesterRecipientAttestations).not.to.include(uid);
          expect(info.schemaAttesterRecipientAttestationsReversed).not.to.include(uid);

          info.schemaAttestationUIDCount = await indexer.getSchemaAttestationUIDCount(schemaId);
          info.schemaAttestationUIDs = await indexer.getSchemaAttestationUIDs(
            schemaId,
            0,
            info.schemaAttestationUIDCount,
            false
          );
          info.schemaAttestationUIDsReversed = await indexer.getSchemaAttestationUIDs(
            schemaId,
            0,
            info.schemaAttestationUIDCount,
            true
          );

          expect(info.schemaAttestationUIDs).not.to.include(uid);
          expect(info.schemaAttestationUIDsReversed).not.to.include(uid);

          infos[uid] = info;
        }

        const res = uids.length === 1 ? await indexer.indexAttestation(uids[0]) : await indexer.indexAttestations(uids);

        for (const uid of uids) {
          const info = infos[uid];

          await expect(res).to.emit(indexer, 'Indexed').withArgs(uid);

          expect(await indexer.isAttestationIndexed(uid)).to.be.true;

          const receivedAttestationsCount = await indexer.getReceivedAttestationUIDCount(
            await recipient.getAddress(),
            schemaId
          );
          expect(receivedAttestationsCount).to.equal(info.receivedAttestationsCount + BigInt(uids.length));
          expect(
            await indexer.getReceivedAttestationUIDs(
              await recipient.getAddress(),
              schemaId,
              0,
              receivedAttestationsCount,
              false
            )
          ).to.include(uid);
          expect(
            await indexer.getReceivedAttestationUIDs(
              await recipient.getAddress(),
              schemaId,
              0,
              receivedAttestationsCount,
              true
            )
          ).to.include(uid);

          const sentAttestationsCount = await indexer.getSentAttestationUIDCount(await sender.getAddress(), schemaId);
          expect(sentAttestationsCount).to.equal(info.sentAttestationsCount + BigInt(uids.length));
          expect(
            await indexer.getSentAttestationUIDs(await sender.getAddress(), schemaId, 0, sentAttestationsCount, false)
          ).to.include(uid);
          expect(
            await indexer.getSentAttestationUIDs(await sender.getAddress(), schemaId, 0, sentAttestationsCount, true)
          ).to.include(uid);

          const schemaAttesterRecipientAttestationCount = await indexer.getSchemaAttesterRecipientAttestationUIDCount(
            schemaId,
            await sender.getAddress(),
            await recipient.getAddress()
          );
          expect(schemaAttesterRecipientAttestationCount).to.equal(
            info.schemaAttesterRecipientAttestationCount + BigInt(uids.length)
          );
          expect(
            await indexer.getSchemaAttesterRecipientAttestationUIDs(
              schemaId,
              await sender.getAddress(),
              await recipient.getAddress(),
              0,
              schemaAttesterRecipientAttestationCount,
              false
            )
          ).to.include(uid);
          expect(
            await indexer.getSchemaAttesterRecipientAttestationUIDs(
              schemaId,
              await sender.getAddress(),
              await recipient.getAddress(),
              0,
              schemaAttesterRecipientAttestationCount,
              true
            )
          ).to.include(uid);

          const schemaAttestationUIDCount = await indexer.getSchemaAttestationUIDCount(schemaId);
          expect(schemaAttestationUIDCount).to.equal(info.schemaAttestationUIDCount + BigInt(uids.length));
          expect(await indexer.getSchemaAttestationUIDs(schemaId, 0, schemaAttestationUIDCount, false)).to.include(uid);
          expect(await indexer.getSchemaAttestationUIDs(schemaId, 0, schemaAttestationUIDCount, true)).to.include(uid);
        }
      };

      const expectIndexedAttestation = (uid: string) => expectIndexedAttestations([uid]);

      it('should index an attestation', async () => {
        for (const uid of uids) {
          await expectIndexedAttestation(uid);
        }
      });

      it('should index multiple attestations', async () => {
        await expectIndexedAttestations(uids);
      });

      it('should revert when attempting to index multiple non-existing attestation', async () => {
        await expect(indexer.indexAttestations([...uids, encodeBytes32String('BAD')])).to.be.revertedWithCustomError(
          indexer,
          'InvalidAttestation'
        );

        await expect(indexer.indexAttestations([encodeBytes32String('BAD'), ...uids])).to.be.revertedWithCustomError(
          indexer,
          'InvalidAttestation'
        );
      });

      it('should handle gracefully an attempt to index the same attestation twice', async () => {
        for (const uid of uids) {
          await expectIndexedAttestation(uid);

          const res = await indexer.indexAttestation(uid);
          expect(res).not.to.emit(indexer, 'Indexed');
        }
      });

      it('should handle gracefully an attempt to index same attestations twice', async () => {
        const indexedUids = uids.slice(2);
        await expectIndexedAttestations(indexedUids);

        const res = await indexer.indexAttestations(uids);
        expect(res).not.to.emit(indexer, 'Indexed');
      });

      it('should revert when providing invalid pagination indexes', async () => {
        await expectIndexedAttestations(uids);

        const receivedAttestationsCount = await indexer.getReceivedAttestationUIDCount(
          await recipient.getAddress(),
          schemaId
        );
        await expect(
          indexer.getReceivedAttestationUIDs(
            await recipient.getAddress(),
            schemaId,
            receivedAttestationsCount + 1n,
            receivedAttestationsCount,
            false
          )
        ).to.be.revertedWithCustomError(indexer, 'InvalidOffset');

        const sentAttestationCount = await indexer.getSentAttestationUIDCount(await sender.getAddress(), schemaId);
        await expect(
          indexer.getSentAttestationUIDs(
            await sender.getAddress(),
            schemaId,
            sentAttestationCount + 1n,
            sentAttestationCount,
            false
          )
        ).to.be.revertedWithCustomError(indexer, 'InvalidOffset');

        const schemaAttesterRecipientAttestationCount = await indexer.getSchemaAttesterRecipientAttestationUIDCount(
          schemaId,
          await sender.getAddress(),
          await recipient.getAddress()
        );
        await expect(
          indexer.getSchemaAttesterRecipientAttestationUIDs(
            schemaId,
            await sender.getAddress(),
            await recipient.getAddress(),
            schemaAttesterRecipientAttestationCount + 1n,
            schemaAttesterRecipientAttestationCount,
            false
          )
        ).to.be.revertedWithCustomError(indexer, 'InvalidOffset');

        const schemaAttestationsCount = await indexer.getSchemaAttestationUIDCount(schemaId);
        await expect(
          indexer.getSchemaAttestationUIDs(schemaId, schemaAttestationsCount + 1n, schemaAttestationsCount, false)
        ).to.be.revertedWithCustomError(indexer, 'InvalidOffset');
      });

      it('should adapt the length of the query if it is too long', async () => {
        await expectIndexedAttestations(uids);

        const receivedAttestationsCount = await indexer.getReceivedAttestationUIDCount(
          await recipient.getAddress(),
          schemaId
        );

        expect(
          await indexer.getReceivedAttestationUIDs(
            await recipient.getAddress(),
            schemaId,
            0,
            receivedAttestationsCount + 100n,
            false
          )
        ).to.deep.equal(
          await indexer.getReceivedAttestationUIDs(
            await recipient.getAddress(),
            schemaId,
            0,
            receivedAttestationsCount,
            false
          )
        );

        const sentAttestationCount = await indexer.getSentAttestationUIDCount(await recipient.getAddress(), schemaId);
        expect(
          await indexer.getSentAttestationUIDs(
            await recipient.getAddress(),
            schemaId,
            0,
            sentAttestationCount + 100n,
            false
          )
        ).to.deep.equal(
          await indexer.getSentAttestationUIDs(await recipient.getAddress(), schemaId, 0, sentAttestationCount, false)
        );

        const schemaAttesterRecipientAttestationCount = await indexer.getSchemaAttesterRecipientAttestationUIDCount(
          schemaId,
          await sender.getAddress(),
          await recipient.getAddress()
        );
        expect(
          await indexer.getSchemaAttesterRecipientAttestationUIDs(
            schemaId,
            await sender.getAddress(),
            await recipient.getAddress(),
            0,
            schemaAttesterRecipientAttestationCount + 100n,
            false
          )
        ).to.deep.equal(
          await indexer.getSchemaAttesterRecipientAttestationUIDs(
            schemaId,
            await sender.getAddress(),
            await recipient.getAddress(),
            0,
            schemaAttesterRecipientAttestationCount,
            false
          )
        );

        const schemaAttestationsCount = await indexer.getSchemaAttestationUIDCount(schemaId);
        expect(
          await indexer.getSchemaAttestationUIDs(
            schemaId,

            0,
            schemaAttestationsCount + 100n,
            false
          )
        ).to.deep.equal(
          await indexer.getSchemaAttestationUIDs(
            schemaId,

            0,
            schemaAttestationsCount,
            false
          )
        );
      });
    });
  });
});
