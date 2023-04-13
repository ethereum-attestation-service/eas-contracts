import Contracts from '../components/Contracts';
import { SchemaRegistry, TestEAS } from '../typechain-types';
import { ZERO_ADDRESS, ZERO_BYTES32 } from '../utils/Constants';
import { getSchemaUID, getUIDFromAttestTx } from '../utils/EAS';
import {
  expectAttestation,
  expectFailedAttestation,
  expectFailedMultiAttestations,
  expectFailedMultiRevocations,
  expectFailedRevocation,
  expectMultiAttestations,
  expectMultiRevocations,
  expectRevocation,
  SignatureType
} from './helpers/EAS';
import { EIP712Utils } from './helpers/EIP712Utils';
import { duration, latest } from './helpers/Time';
import { createWallet } from './helpers/Wallet';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

const {
  utils: { formatBytes32String }
} = ethers;

const EIP712_NAME = 'EAS';

describe('EAS', () => {
  let accounts: SignerWithAddress[];
  let sender: Wallet;
  let sender2: Wallet;
  let recipient: SignerWithAddress;
  let recipient2: SignerWithAddress;

  let registry: SchemaRegistry;
  let eas: TestEAS;
  let eip712Utils: EIP712Utils;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient, recipient2] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();
    sender2 = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(registry.address);

    eip712Utils = await EIP712Utils.fromVerifier(eas);

    const now = await latest();
    expect(await eas.getTime()).to.equal(now);
    await eas.setTime(now);
    expect(await eas.getTime()).to.equal(now);
  });

  describe('construction', () => {
    it('should revert when initialized with an empty schema registry', async () => {
      await expect(Contracts.EAS.deploy(ZERO_ADDRESS)).to.be.revertedWith('InvalidRegistry');
    });

    it('should be properly initialized', async () => {
      expect(await eas.VERSION()).to.equal('0.27');

      expect(await eas.getSchemaRegistry()).to.equal(registry.address);
      expect(await eas.getName()).to.equal(EIP712_NAME);
    });
  });

  describe('attesting', () => {
    let expirationTime: number;
    const data = '0x1234';

    beforeEach(async () => {
      expirationTime = (await eas.getTime()).toNumber() + duration.days(30);
    });

    for (const signatureType of [SignatureType.Direct, SignatureType.Delegated]) {
      context(`via ${signatureType} attestation`, () => {
        it('should revert when attesting to an unregistered schema', async () => {
          await expectFailedAttestation(
            {
              eas,
              eip712Utils
            },
            formatBytes32String('BAD'),
            {
              recipient: recipient.address,
              expirationTime,
              data
            },
            { signatureType, from: sender },
            'InvalidSchema'
          );

          // All requests are to unregistered schemas
          await expectFailedMultiAttestations(
            {
              eas,
              eip712Utils
            },
            [
              {
                schema: formatBytes32String('BAD'),
                requests: [
                  {
                    recipient: recipient.address,
                    expirationTime,
                    data
                  }
                ]
              },
              {
                schema: formatBytes32String('BAD2'),
                requests: [
                  {
                    recipient: recipient.address,
                    expirationTime,
                    data
                  }
                ]
              }
            ],
            { signatureType, from: sender },
            'InvalidSchema'
          );
        });

        context('with registered schemas', () => {
          const schema1 = 'bool like';
          const schema2 = 'bytes32 proposalId, bool vote';
          const schema3 = 'bool hasPhoneNumber, bytes32 phoneHash';
          const schema1Id = getSchemaUID(schema1, ZERO_ADDRESS, true);
          const schema2Id = getSchemaUID(schema2, ZERO_ADDRESS, true);
          const schema3Id = getSchemaUID(schema3, ZERO_ADDRESS, true);

          beforeEach(async () => {
            await registry.register(schema1, ZERO_ADDRESS, true);
            await registry.register(schema2, ZERO_ADDRESS, true);
            await registry.register(schema3, ZERO_ADDRESS, true);
          });

          it('should revert when multi attesting to multiple unregistered schemas', async () => {
            // Only one of the requests is to an unregistered schema
            await expectFailedMultiAttestations(
              { eas, eip712Utils },
              [
                {
                  schema: schema1Id,
                  requests: [
                    {
                      recipient: recipient.address,

                      expirationTime,
                      data
                    }
                  ]
                },
                {
                  schema: schema2Id,
                  requests: [
                    {
                      recipient: recipient.address,

                      expirationTime,
                      data
                    }
                  ]
                },
                {
                  schema: formatBytes32String('BAD'),
                  requests: [
                    {
                      recipient: recipient.address,

                      expirationTime,
                      data
                    }
                  ]
                }
              ],
              { signatureType, from: sender },
              'InvalidSchema'
            );
          });

          it('should revert when attesting with passed expiration time', async () => {
            const expired = (await eas.getTime()).toNumber() - duration.days(1);

            await expectFailedAttestation(
              {
                eas,
                eip712Utils
              },
              schema1Id,
              {
                recipient: recipient.address,
                expirationTime: expired,
                data
              },
              { signatureType, from: sender },
              'InvalidExpirationTime'
            );

            // The first request is invalid
            await expectFailedMultiAttestations(
              { eas, eip712Utils },
              [
                {
                  schema: schema1Id,
                  requests: [
                    {
                      recipient: recipient.address,
                      expirationTime: expired,
                      data
                    },
                    {
                      recipient: recipient.address,
                      expirationTime,
                      data
                    }
                  ]
                },
                {
                  schema: schema2Id,
                  requests: [
                    {
                      recipient: recipient.address,
                      expirationTime,
                      data
                    }
                  ]
                }
              ],
              { signatureType, from: sender },
              'InvalidExpirationTime'
            );

            // The second request is invalid
            await expectFailedMultiAttestations(
              { eas, eip712Utils },
              [
                {
                  schema: schema1Id,
                  requests: [
                    {
                      recipient: recipient.address,
                      expirationTime,
                      data
                    }
                  ]
                },
                {
                  schema: schema2Id,
                  requests: [
                    {
                      recipient: recipient.address,
                      expirationTime,
                      data
                    },
                    {
                      recipient: recipient.address,
                      expirationTime: expired,
                      data
                    }
                  ]
                }
              ],
              { signatureType, from: sender },
              'InvalidExpirationTime'
            );
          });

          it('should allow attesting to an empty recipient', async () => {
            await expectAttestation(
              { eas, eip712Utils },
              schema1Id,
              { recipient: ZERO_ADDRESS, expirationTime, data },
              { signatureType, from: sender }
            );

            await expectMultiAttestations(
              { eas, eip712Utils },
              [
                {
                  schema: schema1Id,
                  requests: [
                    { recipient: ZERO_ADDRESS, expirationTime, data },
                    { recipient: ZERO_ADDRESS, expirationTime, data }
                  ]
                },
                {
                  schema: schema2Id,
                  requests: [
                    { recipient: ZERO_ADDRESS, expirationTime, data },
                    { recipient: ZERO_ADDRESS, expirationTime, data }
                  ]
                }
              ],
              { signatureType, from: sender }
            );
          });

          it('should allow self attestations', async () => {
            await expectAttestation(
              { eas, eip712Utils },
              schema2Id,
              { recipient: sender.address, expirationTime, data },
              { signatureType, from: sender }
            );

            await expectMultiAttestations(
              { eas, eip712Utils },
              [
                {
                  schema: schema1Id,
                  requests: [
                    { recipient: sender.address, expirationTime, data },
                    { recipient: sender.address, expirationTime, data }
                  ]
                }
              ],
              { signatureType, from: sender }
            );
          });

          it('should allow multiple attestations', async () => {
            await expectAttestation(
              {
                eas,
                eip712Utils
              },
              schema1Id,
              {
                recipient: recipient.address,
                expirationTime,
                data
              },
              { signatureType, from: sender }
            );

            await expectAttestation(
              {
                eas,
                eip712Utils
              },
              schema1Id,
              {
                recipient: recipient2.address,
                expirationTime,
                data
              },
              {
                signatureType,
                from: sender
              }
            );
          });

          it('should allow multiple attestations to the same schema', async () => {
            await expectAttestation(
              {
                eas,
                eip712Utils
              },
              schema3Id,
              {
                recipient: recipient.address,
                expirationTime,
                data
              },
              {
                signatureType,
                from: sender,
                bump: 0
              }
            );
            await expectAttestation(
              {
                eas,
                eip712Utils
              },
              schema3Id,
              {
                recipient: recipient.address,
                expirationTime,
                data
              },
              {
                signatureType,
                from: sender,
                bump: 1
              }
            );
            await expectAttestation(
              {
                eas,
                eip712Utils
              },
              schema3Id,
              {
                recipient: recipient.address,
                expirationTime,
                data
              },
              {
                signatureType,
                from: sender,
                bump: 2
              }
            );
          });

          it('should allow attestation without expiration time', async () => {
            await expectAttestation(
              {
                eas,
                eip712Utils
              },
              schema1Id,
              {
                recipient: recipient.address,
                expirationTime: 0,
                data
              },
              { signatureType, from: sender }
            );

            await expectMultiAttestations(
              {
                eas,
                eip712Utils
              },
              [
                {
                  schema: schema1Id,
                  requests: [
                    {
                      recipient: recipient.address,
                      expirationTime: 0,
                      data
                    },
                    {
                      recipient: recipient.address,
                      expirationTime: 0,
                      data
                    }
                  ]
                }
              ],
              { signatureType, from: sender }
            );
          });

          it('should allow attestation without any data', async () => {
            await expectAttestation(
              {
                eas,
                eip712Utils
              },
              schema3Id,
              {
                recipient: recipient.address,
                expirationTime
              },
              { signatureType, from: sender }
            );

            await expectMultiAttestations(
              {
                eas,
                eip712Utils
              },
              [
                {
                  schema: schema2Id,
                  requests: [
                    {
                      recipient: recipient.address,
                      expirationTime
                    },
                    {
                      recipient: recipient.address,
                      expirationTime
                    }
                  ]
                }
              ],
              { signatureType, from: sender }
            );
          });

          it('should store referenced attestation', async () => {
            const uid = await getUIDFromAttestTx(
              eas.attest({
                schema: schema1Id,
                data: {
                  recipient: recipient.address,
                  expirationTime,
                  revocable: true,
                  refUID: ZERO_BYTES32,
                  data,
                  value: 0
                }
              })
            );

            await expectAttestation(
              {
                eas,
                eip712Utils
              },
              schema3Id,
              {
                recipient: recipient.address,
                expirationTime,
                refUID: uid,
                data
              },
              {
                signatureType,
                from: sender
              }
            );

            await expectMultiAttestations(
              {
                eas,
                eip712Utils
              },
              [
                {
                  schema: schema1Id,
                  requests: [
                    {
                      recipient: recipient.address,
                      expirationTime,
                      refUID: uid,
                      data
                    },
                    {
                      recipient: recipient.address,
                      expirationTime,
                      refUID: uid,
                      data
                    }
                  ]
                }
              ],
              {
                signatureType,
                from: sender
              }
            );
          });

          it('should generate unique UIDs for similar attestations', async () => {
            const uid1 = await expectAttestation(
              {
                eas,
                eip712Utils
              },
              schema3Id,
              {
                recipient: recipient.address,
                expirationTime,
                data
              },
              {
                signatureType,
                from: sender,
                bump: 0
              }
            );
            const uid2 = await expectAttestation(
              {
                eas,
                eip712Utils
              },
              schema3Id,
              {
                recipient: recipient.address,
                expirationTime,
                data
              },
              {
                signatureType,
                from: sender,
                bump: 1
              }
            );
            const uid3 = await expectAttestation(
              {
                eas,
                eip712Utils
              },
              schema3Id,
              {
                recipient: recipient.address,
                expirationTime,
                data
              },
              {
                signatureType,
                from: sender,
                bump: 2
              }
            );
            expect(uid1).not.to.equal(uid2);
            expect(uid2).not.to.equal(uid3);
          });

          it('should allow multi layered attestations', async () => {
            await expectMultiAttestations(
              {
                eas,
                eip712Utils
              },
              [
                {
                  schema: schema1Id,
                  requests: [
                    { recipient: recipient.address, expirationTime, data },
                    { recipient: recipient.address, expirationTime, data }
                  ]
                },
                {
                  schema: schema2Id,
                  requests: [{ recipient: recipient.address, expirationTime, data }]
                },
                {
                  schema: schema3Id,
                  requests: [
                    { recipient: recipient.address, expirationTime, data },
                    { recipient: recipient.address, expirationTime, data }
                  ]
                }
              ],
              { signatureType, from: sender }
            );
          });

          it('should revert when attesting to non-existing attestations', async () => {
            await expectFailedAttestation(
              {
                eas,
                eip712Utils
              },
              schema3Id,
              {
                recipient: recipient.address,
                expirationTime,
                refUID: formatBytes32String('INVALID'),
                data
              },
              { signatureType, from: sender },
              'NotFound'
            );

            const uid = await getUIDFromAttestTx(
              eas.attest({
                schema: schema1Id,
                data: {
                  recipient: recipient.address,
                  expirationTime,
                  revocable: true,
                  refUID: ZERO_BYTES32,
                  data,
                  value: 0
                }
              })
            );

            await expectFailedMultiAttestations(
              {
                eas,
                eip712Utils
              },
              [
                {
                  schema: schema1Id,
                  requests: [
                    { recipient: recipient.address, expirationTime, refUID: formatBytes32String('INVALID'), data },
                    {
                      recipient: recipient.address,
                      expirationTime,
                      refUID: uid,
                      data
                    }
                  ]
                }
              ],
              { signatureType, from: sender },
              'NotFound'
            );

            await expectFailedMultiAttestations(
              {
                eas,
                eip712Utils
              },
              [
                {
                  schema: schema1Id,
                  requests: [
                    {
                      recipient: recipient.address,
                      expirationTime,
                      refUID: uid,
                      data
                    },
                    { recipient: recipient.address, expirationTime, refUID: formatBytes32String('INVALID'), data }
                  ]
                }
              ],
              { signatureType, from: sender },
              'NotFound'
            );
          });

          it('should revert when attesting to empty schemas', async () => {
            await expectFailedAttestation(
              {
                eas,
                eip712Utils
              },
              ZERO_BYTES32,
              {
                recipient: recipient.address,
                expirationTime,
                data
              },
              { signatureType, from: sender },
              'InvalidSchema'
            );

            await expectFailedMultiAttestations(
              {
                eas,
                eip712Utils
              },
              [
                {
                  schema: ZERO_BYTES32,
                  requests: [{ recipient: recipient.address, expirationTime, data }]
                },
                {
                  schema: schema1Id,
                  requests: [{ recipient: recipient.address, expirationTime, data }]
                }
              ],
              { signatureType, from: sender },
              'InvalidSchema'
            );

            await expectFailedMultiAttestations(
              {
                eas,
                eip712Utils
              },
              [
                {
                  schema: schema1Id,
                  requests: [{ recipient: recipient.address, expirationTime, data }]
                },
                {
                  schema: ZERO_BYTES32,
                  requests: [{ recipient: recipient.address, expirationTime, data }]
                }
              ],
              { signatureType, from: sender },
              'InvalidSchema'
            );
          });
        });

        context('with an irrevocable schema', () => {
          const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
          const schemaId = getSchemaUID(schema, ZERO_ADDRESS, false);

          beforeEach(async () => {
            await registry.register(schema, ZERO_ADDRESS, false);
          });

          it('should revert when attempting to make a revocable attestation', async () => {
            await expectFailedAttestation(
              {
                eas,
                eip712Utils
              },
              schemaId,
              {
                recipient: recipient.address,
                expirationTime,
                data
              },
              { signatureType, from: sender },
              'Irrevocable'
            );

            await expectFailedMultiAttestations(
              {
                eas,
                eip712Utils
              },
              [
                {
                  schema: schemaId,
                  requests: [
                    {
                      recipient: recipient.address,
                      expirationTime,
                      data
                    },
                    {
                      recipient: recipient.address,
                      expirationTime,
                      revocable: false,
                      data
                    }
                  ]
                }
              ],
              { signatureType, from: sender },
              'Irrevocable'
            );

            await expectFailedMultiAttestations(
              {
                eas,
                eip712Utils
              },
              [
                {
                  schema: schemaId,
                  requests: [
                    {
                      recipient: recipient.address,
                      expirationTime,
                      revocable: false,
                      data
                    },
                    {
                      recipient: recipient.address,
                      expirationTime,
                      data
                    }
                  ]
                }
              ],
              { signatureType, from: sender },
              'Irrevocable'
            );
          });
        });
      });
    }

    it('should revert when multi delegation attesting with inconsistent input lengths', async () => {
      const schema = 'bool count, bytes32 id';
      const schemaId = getSchemaUID(schema, ZERO_ADDRESS, true);
      await registry.register(schema, ZERO_ADDRESS, true);

      await expect(
        eas.multiAttestByDelegation([
          {
            schema: schemaId,
            data: [
              {
                recipient: recipient.address,
                expirationTime,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: ZERO_BYTES32,
                value: 0
              },
              {
                recipient: recipient.address,
                expirationTime,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: ZERO_BYTES32,
                value: 0
              }
            ],
            signatures: [
              {
                v: 28,
                r: formatBytes32String('BAD'),
                s: formatBytes32String('BAD')
              }
            ],
            attester: sender.address
          }
        ])
      ).to.be.revertedWith('InvalidLength');

      await expect(
        eas.multiAttestByDelegation([
          {
            schema: schemaId,
            data: [],
            signatures: [
              {
                v: 28,
                r: formatBytes32String('BAD'),
                s: formatBytes32String('BAD')
              }
            ],
            attester: sender.address
          }
        ])
      ).to.be.revertedWith('InvalidLength');

      await expect(
        eas.multiAttestByDelegation([
          {
            schema: schemaId,
            data: [
              {
                recipient: recipient.address,
                expirationTime,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: ZERO_BYTES32,
                value: 0
              }
            ],
            signatures: [
              {
                v: 28,
                r: formatBytes32String('1'),
                s: formatBytes32String('2')
              },
              {
                v: 28,
                r: formatBytes32String('3'),
                s: formatBytes32String('4')
              }
            ],
            attester: sender.address
          }
        ])
      ).to.be.revertedWith('InvalidLength');

      await expect(
        eas.multiAttestByDelegation([
          {
            schema: schemaId,
            data: [
              {
                recipient: recipient.address,
                expirationTime,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: ZERO_BYTES32,
                value: 0
              },
              {
                recipient: recipient.address,
                expirationTime,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: ZERO_BYTES32,
                value: 0
              }
            ],
            signatures: [],
            attester: sender.address
          }
        ])
      ).to.be.revertedWith('InvalidLength');
    });
  });

  describe('revocation', () => {
    const schema = 'bool hasPhoneNumber, bytes32 phoneHash';
    const schemaId = getSchemaUID(schema, ZERO_ADDRESS, true);

    let expirationTime: number;
    const data = '0x1234';

    beforeEach(async () => {
      await registry.register(schema, ZERO_ADDRESS, true);

      expirationTime = (await eas.getTime()).toNumber() + duration.days(30);
    });

    for (const signatureType of [SignatureType.Direct, SignatureType.Delegated]) {
      context(`via ${signatureType} revocation`, () => {
        let uid: string;
        let uids: string[] = [];

        beforeEach(async () => {
          uid = await getUIDFromAttestTx(
            eas.connect(sender).attest({
              schema: schemaId,
              data: {
                recipient: recipient.address,
                expirationTime,
                revocable: true,
                refUID: ZERO_BYTES32,
                data,
                value: 0
              }
            })
          );

          uids = [];

          for (let i = 0; i < 2; i++) {
            uids.push(
              await getUIDFromAttestTx(
                eas.connect(sender).attest({
                  schema: schemaId,
                  data: {
                    recipient: recipient.address,
                    expirationTime,
                    revocable: true,
                    refUID: ZERO_BYTES32,
                    data,
                    value: 0
                  }
                })
              )
            );
          }
        });

        it('should revert when revoking a non-existing attestation', async () => {
          await expectFailedRevocation(
            { eas, eip712Utils },
            schemaId,
            { uid: formatBytes32String('BAD') },
            { signatureType, from: sender },
            'NotFound'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils },
            [{ schema: schemaId, requests: [{ uid: formatBytes32String('BAD') }, { uid }] }],
            { signatureType, from: sender },
            'NotFound'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils },
            [{ schema: schemaId, requests: [{ uid }, { uid: formatBytes32String('BAD') }] }],
            { signatureType, from: sender },
            'NotFound'
          );
        });

        it("should revert when revoking a someone's else attestation", async () => {
          await expectFailedRevocation(
            { eas, eip712Utils },
            schemaId,
            { uid },
            { signatureType, from: sender2 },
            'AccessDenied'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils },
            [{ schema: schemaId, requests: [{ uid }, { uid: uids[0] }] }],
            { signatureType, from: sender2 },
            'AccessDenied'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils },
            [{ schema: schemaId, requests: [{ uid: uids[1] }, { uid }] }],
            { signatureType, from: sender2 },
            'AccessDenied'
          );
        });

        it('should allow to revoke existing attestations', async () => {
          await expectRevocation({ eas, eip712Utils }, schemaId, { uid }, { signatureType, from: sender });

          await expectMultiRevocations(
            { eas, eip712Utils },
            [
              {
                schema: schemaId,
                requests: uids.map((uid) => ({ uid }))
              }
            ],
            { signatureType, from: sender }
          );
        });

        it('should revert when revoking an already revoked attestation', async () => {
          await expectRevocation({ eas, eip712Utils }, schemaId, { uid }, { signatureType, from: sender });
          await expectFailedRevocation(
            { eas, eip712Utils },
            schemaId,
            { uid },
            { signatureType, from: sender },
            'AlreadyRevoked'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils },
            [{ schema: schemaId, requests: [{ uid }, { uid: uids[0] }] }],
            { signatureType, from: sender },
            'AlreadyRevoked'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils },
            [{ schema: schemaId, requests: [{ uid: uids[1] }, { uid }] }],
            { signatureType, from: sender },
            'AlreadyRevoked'
          );
        });

        it('should revert when attempting to revoke attestations while specifying the wrong schema', async () => {
          const schema2 = 'bool count, bytes32 id';
          const schema2Id = getSchemaUID(schema2, ZERO_ADDRESS, true);
          await registry.register(schema2, ZERO_ADDRESS, true);

          await expectFailedRevocation(
            { eas, eip712Utils },
            schema2Id,
            { uid },
            { signatureType, from: sender },
            'InvalidSchema'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils },
            [
              { schema: schema2Id, requests: [{ uid }] },
              { schema: schemaId, requests: [{ uid: uids[0] }] }
            ],
            { signatureType, from: sender },
            'InvalidSchema'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils },
            [
              { schema: schemaId, requests: [{ uid }] },
              { schema: schema2Id, requests: [{ uid: uids[0] }] }
            ],
            { signatureType, from: sender },
            'InvalidSchema'
          );
        });

        it('should revert when attempting to revoke attestations while specifying an empty schema', async () => {
          await expectFailedRevocation(
            { eas, eip712Utils },
            ZERO_BYTES32,
            { uid },
            { signatureType, from: sender },
            'InvalidSchema'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils },
            [
              { schema: ZERO_BYTES32, requests: [{ uid }] },
              { schema: schemaId, requests: [{ uid: uids[0] }] }
            ],
            { signatureType, from: sender },
            'InvalidSchema'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils },
            [
              { schema: schemaId, requests: [{ uid }] },
              { schema: ZERO_BYTES32, requests: [{ uid: uids[0] }] }
            ],
            { signatureType, from: sender },
            'InvalidSchema'
          );
        });

        context('with irrevocable attestations', () => {
          beforeEach(async () => {
            uid = await getUIDFromAttestTx(
              eas.connect(sender).attest({
                schema: schemaId,
                data: {
                  recipient: recipient.address,
                  expirationTime,
                  revocable: false,
                  refUID: ZERO_BYTES32,
                  data,
                  value: 0
                }
              })
            );

            uids = [];

            for (let i = 0; i < 2; i++) {
              uids.push(
                await getUIDFromAttestTx(
                  eas.connect(sender).attest({
                    schema: schemaId,
                    data: {
                      recipient: recipient.address,
                      expirationTime,
                      revocable: false,
                      refUID: ZERO_BYTES32,
                      data,
                      value: 0
                    }
                  })
                )
              );
            }
          });

          it('should revert when revoking', async () => {
            await expectFailedRevocation(
              { eas, eip712Utils },
              schemaId,
              { uid },
              { signatureType, from: sender },
              'Irrevocable'
            );

            await expectFailedMultiRevocations(
              { eas, eip712Utils },
              [{ schema: schemaId, requests: [{ uid }, { uid: uids[0] }] }],
              { signatureType, from: sender },
              'Irrevocable'
            );

            await expectFailedMultiRevocations(
              { eas, eip712Utils },
              [{ schema: schemaId, requests: [{ uid: uids[1] }, { uid }] }],
              { signatureType, from: sender },
              'Irrevocable'
            );
          });
        });

        context('with an irrevocable schema', () => {
          const schema2 = 'bool isFriend';
          const schema2Id = getSchemaUID(schema2, ZERO_ADDRESS, false);

          beforeEach(async () => {
            await registry.register(schema2, ZERO_ADDRESS, false);

            uid = await getUIDFromAttestTx(
              eas.connect(sender).attest({
                schema: schema2Id,
                data: {
                  recipient: recipient.address,
                  expirationTime,
                  revocable: false,
                  refUID: ZERO_BYTES32,
                  data,
                  value: 0
                }
              })
            );

            uids = [];

            for (let i = 0; i < 2; i++) {
              uids.push(
                await getUIDFromAttestTx(
                  eas.connect(sender).attest({
                    schema: schema2Id,
                    data: {
                      recipient: recipient.address,
                      expirationTime,
                      revocable: false,
                      refUID: ZERO_BYTES32,
                      data,
                      value: 0
                    }
                  })
                )
              );
            }
          });

          it('should revert when revoking', async () => {
            await expectFailedRevocation(
              { eas, eip712Utils },
              schema2Id,
              { uid },
              { signatureType, from: sender },
              'Irrevocable'
            );

            await expectFailedMultiRevocations(
              { eas, eip712Utils },
              [{ schema: schema2Id, requests: [{ uid }, { uid: uids[0] }] }],
              { signatureType, from: sender },
              'Irrevocable'
            );

            await expectFailedMultiRevocations(
              { eas, eip712Utils },
              [{ schema: schema2Id, requests: [{ uid: uids[1] }, { uid }] }],
              { signatureType, from: sender },
              'Irrevocable'
            );
          });
        });
      });
    }

    it('should revert when multi delegation revoking with inconsistent input lengths', async () => {
      const uid = await getUIDFromAttestTx(
        eas.connect(sender).attest({
          schema: schemaId,
          data: {
            recipient: recipient.address,
            expirationTime,
            revocable: true,
            refUID: ZERO_BYTES32,
            data,
            value: 0
          }
        })
      );
      const uid2 = await getUIDFromAttestTx(
        eas.connect(sender).attest({
          schema: schemaId,
          data: {
            recipient: recipient.address,
            expirationTime,
            revocable: true,
            refUID: ZERO_BYTES32,
            data,
            value: 0
          }
        })
      );

      await expect(
        eas.multiRevokeByDelegation([
          {
            schema: schemaId,
            data: [
              { uid, value: 0 },
              { uid: uid2, value: 0 }
            ],
            signatures: [
              {
                v: 28,
                r: formatBytes32String('1'),
                s: formatBytes32String('2')
              }
            ],
            revoker: sender.address
          }
        ])
      ).to.be.revertedWith('InvalidLength');

      await expect(
        eas.multiRevokeByDelegation([
          {
            schema: schemaId,
            data: [],
            signatures: [
              {
                v: 28,
                r: formatBytes32String('1'),
                s: formatBytes32String('2')
              }
            ],
            revoker: sender.address
          }
        ])
      ).to.be.revertedWith('InvalidLength');

      await expect(
        eas.multiRevokeByDelegation([
          {
            schema: schemaId,
            data: [{ uid, value: 0 }],
            signatures: [
              {
                v: 28,
                r: formatBytes32String('1'),
                s: formatBytes32String('2')
              },
              {
                v: 28,
                r: formatBytes32String('3'),
                s: formatBytes32String('4')
              }
            ],
            revoker: sender.address
          }
        ])
      ).to.be.revertedWith('InvalidLength');

      await expect(
        eas.multiRevokeByDelegation([
          {
            schema: schemaId,
            data: [
              { uid, value: 0 },
              { uid: uid2, value: 0 }
            ],
            signatures: [],
            revoker: sender.address
          }
        ])
      ).to.be.revertedWith('InvalidLength');
    });
  });

  describe('timestamping', () => {
    const expectTimestamp = async (data: string | string[]) => {
      const res = Array.isArray(data) ? await eas.multiTimestamp(data) : eas.timestamp(data);
      const timestamp = await eas.getTime();

      for (const item of Array.isArray(data) ? data : [data]) {
        await expect(res).to.emit(eas, 'Timestamped').withArgs(item, timestamp);

        expect(await eas.getTimestamp(item)).to.equal(timestamp);
      }
    };

    const data1 = formatBytes32String('0x1234');
    const data2 = formatBytes32String('0x4567');
    const data3 = formatBytes32String('0x6666');
    const data4 = formatBytes32String('Hello World');
    const data5 = formatBytes32String('0x8888');

    it('should timestamp a single data', async () => {
      await expectTimestamp(data1);
      await expectTimestamp(data2);
      await expectTimestamp(ZERO_BYTES32);
    });

    it('should timestamp multiple data', async () => {
      await expectTimestamp([data1, data2, ZERO_BYTES32]);
      await expectTimestamp([data3, data4, data5]);
    });

    it('should revert when attempting to timestamp the same data twice', async () => {
      const data = data1;
      await expectTimestamp(data);

      await expect(eas.timestamp(data)).to.be.revertedWith('AlreadyTimestamped');
    });

    it('should revert when attempting to timestamp the same multiple data twice', async () => {
      const data = [data1, data4];
      await expectTimestamp(data);

      await expect(eas.multiTimestamp(data)).to.be.revertedWith('AlreadyTimestamped');
      await expect(eas.multiTimestamp([data3, ...data])).to.be.revertedWith('AlreadyTimestamped');
    });

    it("should return 0 for any data that wasn't timestamped multiple data", async () => {
      expect(await eas.getTimestamp(data5)).to.equal(0);
    });
  });

  describe('revoking offchain', () => {
    const expectRevoke = async (data: string | string[]) => {
      const res = Array.isArray(data)
        ? await eas.connect(sender).multiRevokeOffchain(data)
        : await eas.connect(sender).revokeOffchain(data);

      const timestamp = await eas.getTime();

      for (const item of Array.isArray(data) ? data : [data]) {
        await expect(res).to.emit(eas, 'RevokedOffchain').withArgs(sender.address, item, timestamp);
        expect(await eas.getRevokeOffchain(sender.address, item)).to.equal(timestamp);
      }
    };

    const data1 = formatBytes32String('0x1234');
    const data2 = formatBytes32String('0x4567');
    const data3 = formatBytes32String('0x6666');
    const data4 = formatBytes32String('Hello World');
    const data5 = formatBytes32String('0x8888');

    it('should revoke a single data', async () => {
      await expectRevoke(data1);
      await expectRevoke(data2);
      await expectRevoke(ZERO_BYTES32);
    });

    it('should revoke multiple data', async () => {
      await expectRevoke([data1, data2, ZERO_BYTES32]);
      await expectRevoke([data3, data4, data5]);
    });

    it('should revert when attempting to revoke the same data twice', async () => {
      const data = data1;
      await expectRevoke(data);

      await expect(eas.connect(sender).revokeOffchain(data)).to.be.revertedWith('AlreadyRevokedOffchain');
    });

    it('should not revert when attempting to revoke the same data twice with two different accounts', async () => {
      const data = data1;
      await expectRevoke(data);

      await expect(eas.connect(sender2).revokeOffchain(data)).to.not.be.revertedWith('AlreadyRevokedOffchain');
    });

    it('should revert when attempting to timestamp the same multiple data twice', async () => {
      const data = [data1, data4];
      await expectRevoke(data);

      await expect(eas.connect(sender).multiRevokeOffchain(data)).to.be.revertedWith('AlreadyRevokedOffchain');
      await expect(eas.connect(sender).multiRevokeOffchain([data3, ...data])).to.be.revertedWith(
        'AlreadyRevokedOffchain'
      );
    });

    it("should return 0 for any data that wasn't timestamped multiple data", async () => {
      expect(await eas.getRevokeOffchain(sender.address, data5)).to.equal(0);
    });
  });
});
