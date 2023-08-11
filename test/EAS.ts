import { encodeBytes32String, Signer } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../components/Contracts';
import { SchemaRegistry, TestEAS, TestEIP712Proxy } from '../typechain-types';
import { NO_EXPIRATION, ZERO_ADDRESS, ZERO_BYTES32 } from '../utils/Constants';
import { getSchemaUID, getUIDFromAttestTx } from '../utils/EAS';
import { expect } from './helpers/Chai';
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
import { EIP712ProxyUtils } from './helpers/EIP712ProxyUtils';
import { EIP712Utils } from './helpers/EIP712Utils';
import { duration, latest } from './helpers/Time';
import { createWallet } from './helpers/Wallet';

const EIP712_NAME = 'EAS';
const EIP712_PROXY_NAME = 'EAS-Proxy';

describe('EAS', () => {
  let accounts: Signer[];
  let sender: Signer;
  let sender2: Signer;
  let recipient: Signer;
  let recipient2: Signer;

  let registry: SchemaRegistry;
  let eas: TestEAS;
  let proxy: TestEIP712Proxy;
  let eip712Utils: EIP712Utils;
  let eip712ProxyUtils: EIP712ProxyUtils;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient, recipient2] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();
    sender2 = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(await registry.getAddress());

    proxy = await Contracts.TestEIP712Proxy.deploy(await eas.getAddress(), EIP712_PROXY_NAME);

    eip712Utils = await EIP712Utils.fromVerifier(eas);
    eip712ProxyUtils = await EIP712ProxyUtils.fromProxy(proxy);

    const now = await latest();
    expect(await eas.getTime()).to.equal(now);
    await eas.setTime(now);
    expect(await eas.getTime()).to.equal(now);
  });

  describe('construction', () => {
    it('should revert when initialized with an empty schema registry', async () => {
      await expect(Contracts.EAS.deploy(ZERO_ADDRESS)).to.be.revertedWithCustomError(eas, 'InvalidRegistry');
    });

    it('should be properly initialized', async () => {
      expect(await eas.version()).to.equal('1.1.0');

      expect(await eas.getSchemaRegistry()).to.equal(await registry.getAddress());
      expect(await eas.getName()).to.equal(EIP712_NAME);
    });
  });

  describe('attesting', () => {
    let expirationTime: bigint;
    const data = '0x1234';

    beforeEach(async () => {
      expirationTime = (await eas.getTime()) + duration.days(30n);
    });

    for (const signatureType of [SignatureType.Direct, SignatureType.Delegated, SignatureType.DelegatedProxy]) {
      context(`via ${signatureType} attestation`, () => {
        it('should revert when attesting to an unregistered schema', async () => {
          await expectFailedAttestation(
            {
              eas,
              eip712Utils,
              eip712ProxyUtils
            },
            encodeBytes32String('BAD'),
            {
              recipient: await recipient.getAddress(),
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
              eip712Utils,
              eip712ProxyUtils
            },
            [
              {
                schema: encodeBytes32String('BAD'),
                requests: [
                  {
                    recipient: await recipient.getAddress(),
                    expirationTime,
                    data
                  }
                ]
              },
              {
                schema: encodeBytes32String('BAD2'),
                requests: [
                  {
                    recipient: await recipient.getAddress(),
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
              { eas, eip712Utils, eip712ProxyUtils },
              [
                {
                  schema: schema1Id,
                  requests: [
                    {
                      recipient: await recipient.getAddress(),

                      expirationTime,
                      data
                    }
                  ]
                },
                {
                  schema: schema2Id,
                  requests: [
                    {
                      recipient: await recipient.getAddress(),

                      expirationTime,
                      data
                    }
                  ]
                },
                {
                  schema: encodeBytes32String('BAD'),
                  requests: [
                    {
                      recipient: await recipient.getAddress(),

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
            const expired = (await eas.getTime()) - duration.days(1n);

            await expectFailedAttestation(
              {
                eas,
                eip712Utils,
                eip712ProxyUtils
              },
              schema1Id,
              {
                recipient: await recipient.getAddress(),
                expirationTime: expired,
                data
              },
              { signatureType, from: sender },
              'InvalidExpirationTime'
            );

            // The first request is invalid
            await expectFailedMultiAttestations(
              { eas, eip712Utils, eip712ProxyUtils },
              [
                {
                  schema: schema1Id,
                  requests: [
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime: expired,
                      data
                    },
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime,
                      data
                    }
                  ]
                },
                {
                  schema: schema2Id,
                  requests: [
                    {
                      recipient: await recipient.getAddress(),
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
              { eas, eip712Utils, eip712ProxyUtils },
              [
                {
                  schema: schema1Id,
                  requests: [
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime,
                      data
                    }
                  ]
                },
                {
                  schema: schema2Id,
                  requests: [
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime,
                      data
                    },
                    {
                      recipient: await recipient.getAddress(),
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
              { eas, eip712Utils, eip712ProxyUtils },
              schema1Id,
              { recipient: ZERO_ADDRESS, expirationTime, data: '0x00' },
              { signatureType, from: sender }
            );

            await expectMultiAttestations(
              { eas, eip712Utils, eip712ProxyUtils },
              [
                {
                  schema: schema1Id,
                  requests: [
                    { recipient: ZERO_ADDRESS, expirationTime, data: encodeBytes32String('1') },
                    { recipient: ZERO_ADDRESS, expirationTime, data: encodeBytes32String('2') }
                  ]
                },
                {
                  schema: schema2Id,
                  requests: [
                    { recipient: ZERO_ADDRESS, expirationTime, data: encodeBytes32String('3') },
                    { recipient: ZERO_ADDRESS, expirationTime, data: encodeBytes32String('4') }
                  ]
                }
              ],
              { signatureType, from: sender }
            );
          });

          it('should allow self attestations', async () => {
            await expectAttestation(
              { eas, eip712Utils, eip712ProxyUtils },
              schema2Id,
              { recipient: await sender.getAddress(), expirationTime, data: encodeBytes32String('0') },
              { signatureType, from: sender }
            );

            await expectMultiAttestations(
              { eas, eip712Utils, eip712ProxyUtils },
              [
                {
                  schema: schema1Id,
                  requests: [
                    { recipient: await sender.getAddress(), expirationTime, data: encodeBytes32String('1') },
                    { recipient: await sender.getAddress(), expirationTime, data: encodeBytes32String('2') }
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
                eip712Utils,
                eip712ProxyUtils
              },
              schema1Id,
              {
                recipient: await recipient.getAddress(),
                expirationTime,
                data: encodeBytes32String('0')
              },
              { signatureType, from: sender }
            );

            await expectAttestation(
              {
                eas,
                eip712Utils,
                eip712ProxyUtils
              },
              schema1Id,
              {
                recipient: await recipient2.getAddress(),
                expirationTime,
                data: encodeBytes32String('1')
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
                eip712Utils,
                eip712ProxyUtils
              },
              schema3Id,
              {
                recipient: await recipient.getAddress(),
                expirationTime,
                data: encodeBytes32String('0')
              },
              {
                signatureType,
                from: sender
              }
            );
            await expectAttestation(
              {
                eas,
                eip712Utils,
                eip712ProxyUtils
              },
              schema3Id,
              {
                recipient: await recipient.getAddress(),
                expirationTime,
                data: encodeBytes32String('1')
              },
              {
                signatureType,
                from: sender
              }
            );
            await expectAttestation(
              {
                eas,
                eip712Utils,
                eip712ProxyUtils
              },
              schema3Id,
              {
                recipient: await recipient.getAddress(),
                expirationTime,
                data: encodeBytes32String('2')
              },
              {
                signatureType,
                from: sender
              }
            );
          });

          it('should allow attestation without expiration time', async () => {
            await expectAttestation(
              {
                eas,
                eip712Utils,
                eip712ProxyUtils
              },
              schema1Id,
              {
                recipient: await recipient.getAddress(),
                expirationTime: NO_EXPIRATION,
                data: encodeBytes32String('0')
              },
              { signatureType, from: sender }
            );

            await expectMultiAttestations(
              {
                eas,
                eip712Utils,
                eip712ProxyUtils
              },
              [
                {
                  schema: schema1Id,
                  requests: [
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime: NO_EXPIRATION,
                      data: encodeBytes32String('1')
                    },
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime: NO_EXPIRATION,
                      data: encodeBytes32String('2')
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
                eip712Utils,
                eip712ProxyUtils
              },
              schema3Id,
              {
                recipient: await recipient.getAddress(),
                expirationTime,
                data: encodeBytes32String('0')
              },
              { signatureType, from: sender }
            );

            await expectMultiAttestations(
              {
                eas,
                eip712Utils,
                eip712ProxyUtils
              },
              [
                {
                  schema: schema2Id,
                  requests: [
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime,
                      data: encodeBytes32String('1')
                    },
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime,
                      data: encodeBytes32String('2')
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
                  recipient: await recipient.getAddress(),
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
                eip712Utils,
                eip712ProxyUtils
              },
              schema3Id,
              {
                recipient: await recipient.getAddress(),
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
                eip712Utils,
                eip712ProxyUtils
              },
              [
                {
                  schema: schema1Id,
                  requests: [
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime,
                      refUID: uid,
                      data: encodeBytes32String('1')
                    },
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime,
                      refUID: uid,
                      data: encodeBytes32String('2')
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

          if (signatureType !== SignatureType.DelegatedProxy) {
            it('should generate unique UIDs for similar attestations', async () => {
              const uid1 = await expectAttestation(
                {
                  eas,
                  eip712Utils,
                  eip712ProxyUtils
                },
                schema3Id,
                {
                  recipient: await recipient.getAddress(),
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
                  eip712Utils,
                  eip712ProxyUtils
                },
                schema3Id,
                {
                  recipient: await recipient.getAddress(),
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
                  eip712Utils,
                  eip712ProxyUtils
                },
                schema3Id,
                {
                  recipient: await recipient.getAddress(),
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
          }

          it('should allow multi layered attestations', async () => {
            await expectMultiAttestations(
              {
                eas,
                eip712Utils,
                eip712ProxyUtils
              },
              [
                {
                  schema: schema1Id,
                  requests: [
                    { recipient: await recipient.getAddress(), expirationTime, data: encodeBytes32String('0') },
                    { recipient: await recipient.getAddress(), expirationTime, data: encodeBytes32String('1') }
                  ]
                },
                {
                  schema: schema2Id,
                  requests: [
                    { recipient: await recipient.getAddress(), expirationTime, data: encodeBytes32String('2') }
                  ]
                },
                {
                  schema: schema3Id,
                  requests: [
                    { recipient: await recipient.getAddress(), expirationTime, data: encodeBytes32String('3') },
                    { recipient: await recipient.getAddress(), expirationTime, data: encodeBytes32String('4') }
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
                eip712Utils,
                eip712ProxyUtils
              },
              schema3Id,
              {
                recipient: await recipient.getAddress(),
                expirationTime,
                refUID: encodeBytes32String('INVALID'),
                data
              },
              { signatureType, from: sender },
              'NotFound'
            );

            const uid = await getUIDFromAttestTx(
              eas.attest({
                schema: schema1Id,
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

            await expectFailedMultiAttestations(
              {
                eas,
                eip712Utils,
                eip712ProxyUtils
              },
              [
                {
                  schema: schema1Id,
                  requests: [
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime,
                      refUID: encodeBytes32String('INVALID'),
                      data
                    },
                    {
                      recipient: await recipient.getAddress(),
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
                eip712Utils,
                eip712ProxyUtils
              },
              [
                {
                  schema: schema1Id,
                  requests: [
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime,
                      refUID: uid,
                      data
                    },
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime,
                      refUID: encodeBytes32String('INVALID'),
                      data
                    }
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
                eip712Utils,
                eip712ProxyUtils
              },
              ZERO_BYTES32,
              {
                recipient: await recipient.getAddress(),
                expirationTime,
                data
              },
              { signatureType, from: sender },
              'InvalidSchema'
            );

            await expectFailedMultiAttestations(
              {
                eas,
                eip712Utils,
                eip712ProxyUtils
              },
              [
                {
                  schema: ZERO_BYTES32,
                  requests: [{ recipient: await recipient.getAddress(), expirationTime, data }]
                },
                {
                  schema: schema1Id,
                  requests: [{ recipient: await recipient.getAddress(), expirationTime, data }]
                }
              ],
              { signatureType, from: sender },
              'InvalidSchema'
            );

            await expectFailedMultiAttestations(
              {
                eas,
                eip712Utils,
                eip712ProxyUtils
              },
              [
                {
                  schema: schema1Id,
                  requests: [{ recipient: await recipient.getAddress(), expirationTime, data }]
                },
                {
                  schema: ZERO_BYTES32,
                  requests: [{ recipient: await recipient.getAddress(), expirationTime, data }]
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
                eip712Utils,
                eip712ProxyUtils
              },
              schemaId,
              {
                recipient: await recipient.getAddress(),
                expirationTime,
                data
              },
              { signatureType, from: sender },
              'Irrevocable'
            );

            await expectFailedMultiAttestations(
              {
                eas,
                eip712Utils,
                eip712ProxyUtils
              },
              [
                {
                  schema: schemaId,
                  requests: [
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime,
                      data
                    },
                    {
                      recipient: await recipient.getAddress(),
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
                eip712Utils,
                eip712ProxyUtils
              },
              [
                {
                  schema: schemaId,
                  requests: [
                    {
                      recipient: await recipient.getAddress(),
                      expirationTime,
                      revocable: false,
                      data
                    },
                    {
                      recipient: await recipient.getAddress(),
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
                recipient: await recipient.getAddress(),
                expirationTime,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: ZERO_BYTES32,
                value: 0
              },
              {
                recipient: await recipient.getAddress(),
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
                r: encodeBytes32String('BAD'),
                s: encodeBytes32String('BAD')
              }
            ],
            attester: await sender.getAddress()
          }
        ])
      ).to.be.revertedWithCustomError(eas, 'InvalidLength');

      await expect(
        eas.multiAttestByDelegation([
          {
            schema: schemaId,
            data: [],
            signatures: [
              {
                v: 28,
                r: encodeBytes32String('BAD'),
                s: encodeBytes32String('BAD')
              }
            ],
            attester: await sender.getAddress()
          }
        ])
      ).to.be.revertedWithCustomError(eas, 'InvalidLength');

      await expect(
        eas.multiAttestByDelegation([
          {
            schema: schemaId,
            data: [
              {
                recipient: await recipient.getAddress(),
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
                r: encodeBytes32String('1'),
                s: encodeBytes32String('2')
              },
              {
                v: 28,
                r: encodeBytes32String('3'),
                s: encodeBytes32String('4')
              }
            ],
            attester: await sender.getAddress()
          }
        ])
      ).to.be.revertedWithCustomError(eas, 'InvalidLength');

      await expect(
        eas.multiAttestByDelegation([
          {
            schema: schemaId,
            data: [
              {
                recipient: await recipient.getAddress(),
                expirationTime,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: ZERO_BYTES32,
                value: 0
              },
              {
                recipient: await recipient.getAddress(),
                expirationTime,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: ZERO_BYTES32,
                value: 0
              }
            ],
            signatures: [],
            attester: await sender.getAddress()
          }
        ])
      ).to.be.revertedWithCustomError(eas, 'InvalidLength');
    });
  });

  describe('revocation', () => {
    const schema = 'bool hasPhoneNumber, bytes32 phoneHash';
    const schemaId = getSchemaUID(schema, ZERO_ADDRESS, true);

    let expirationTime: bigint;
    const data = '0x1234';

    beforeEach(async () => {
      await registry.register(schema, ZERO_ADDRESS, true);

      expirationTime = (await eas.getTime()) + duration.days(30n);
    });

    for (const signatureType of [SignatureType.Direct, SignatureType.Delegated, SignatureType.DelegatedProxy]) {
      context(`via ${signatureType} revocation`, () => {
        let uid: string;
        let uids: string[] = [];

        beforeEach(async () => {
          ({ uid } = await expectAttestation(
            { eas, eip712Utils, eip712ProxyUtils },
            schemaId,
            { recipient: ZERO_ADDRESS, expirationTime, data: encodeBytes32String('0') },
            { signatureType, from: sender }
          ));

          uids = [];

          for (let i = 0; i < 2; i++) {
            const { uid: newUid } = await expectAttestation(
              { eas, eip712Utils, eip712ProxyUtils },
              schemaId,
              { recipient: ZERO_ADDRESS, expirationTime, data: encodeBytes32String((i + 1).toString()) },
              { signatureType, from: sender }
            );

            uids.push(newUid);
          }
        });

        it('should revert when revoking a non-existing attestation', async () => {
          await expectFailedRevocation(
            { eas, eip712Utils, eip712ProxyUtils },
            schemaId,
            { uid: encodeBytes32String('BAD') },
            { signatureType, from: sender },
            'NotFound'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils, eip712ProxyUtils },
            [{ schema: schemaId, requests: [{ uid: encodeBytes32String('BAD') }, { uid }] }],
            { signatureType, from: sender },
            'NotFound'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils, eip712ProxyUtils },
            [{ schema: schemaId, requests: [{ uid }, { uid: encodeBytes32String('BAD') }] }],
            { signatureType, from: sender },
            'NotFound'
          );
        });

        it("should revert when revoking a someone's else attestation", async () => {
          await expectFailedRevocation(
            { eas, eip712Utils, eip712ProxyUtils },
            schemaId,
            { uid },
            { signatureType, from: sender2 },
            'AccessDenied'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils, eip712ProxyUtils },
            [{ schema: schemaId, requests: [{ uid }, { uid: uids[0] }] }],
            { signatureType, from: sender2 },
            'AccessDenied'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils, eip712ProxyUtils },
            [{ schema: schemaId, requests: [{ uid: uids[1] }, { uid }] }],
            { signatureType, from: sender2 },
            'AccessDenied'
          );
        });

        it('should allow to revoke existing attestations', async () => {
          await expectRevocation(
            { eas, eip712Utils, eip712ProxyUtils },
            schemaId,
            { uid },
            { signatureType, from: sender }
          );

          await expectMultiRevocations(
            { eas, eip712Utils, eip712ProxyUtils },
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
          await expectRevocation(
            { eas, eip712Utils, eip712ProxyUtils },
            schemaId,
            { uid },
            { signatureType, from: sender }
          );

          await expectFailedRevocation(
            { eas, eip712Utils, eip712ProxyUtils },
            schemaId,
            { uid },
            { signatureType, from: sender, deadline: (await latest()) + duration.days(1n) },
            'AlreadyRevoked'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils, eip712ProxyUtils },
            [{ schema: schemaId, requests: [{ uid }, { uid: uids[0] }] }],
            { signatureType, from: sender, deadline: (await latest()) + duration.days(1n) },
            'AlreadyRevoked'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils, eip712ProxyUtils },
            [{ schema: schemaId, requests: [{ uid: uids[1] }, { uid }] }],
            { signatureType, from: sender, deadline: (await latest()) + duration.days(1n) },
            'AlreadyRevoked'
          );
        });

        it('should revert when attempting to revoke attestations while specifying the wrong schema', async () => {
          const schema2 = 'bool count, bytes32 id';
          const schema2Id = getSchemaUID(schema2, ZERO_ADDRESS, true);
          await registry.register(schema2, ZERO_ADDRESS, true);

          await expectFailedRevocation(
            { eas, eip712Utils, eip712ProxyUtils },
            schema2Id,
            { uid },
            { signatureType, from: sender },
            'InvalidSchema'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils, eip712ProxyUtils },
            [
              { schema: schema2Id, requests: [{ uid }] },
              { schema: schemaId, requests: [{ uid: uids[0] }] }
            ],
            { signatureType, from: sender },
            'InvalidSchema'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils, eip712ProxyUtils },
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
            { eas, eip712Utils, eip712ProxyUtils },
            ZERO_BYTES32,
            { uid },
            { signatureType, from: sender },
            'InvalidSchema'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils, eip712ProxyUtils },
            [
              { schema: ZERO_BYTES32, requests: [{ uid }] },
              { schema: schemaId, requests: [{ uid: uids[0] }] }
            ],
            { signatureType, from: sender },
            'InvalidSchema'
          );

          await expectFailedMultiRevocations(
            { eas, eip712Utils, eip712ProxyUtils },
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
            ({ uid } = await expectAttestation(
              { eas, eip712Utils, eip712ProxyUtils },
              schemaId,
              { recipient: ZERO_ADDRESS, expirationTime, revocable: false, data: encodeBytes32String('0') },
              { signatureType, from: sender }
            ));

            uids = [];

            for (let i = 0; i < 2; i++) {
              const { uid: newUid } = await expectAttestation(
                { eas, eip712Utils, eip712ProxyUtils },
                schemaId,
                {
                  recipient: ZERO_ADDRESS,
                  expirationTime,
                  revocable: false,
                  data: encodeBytes32String((i + 1).toString())
                },
                { signatureType, from: sender }
              );

              uids.push(newUid);
            }
          });

          it('should revert when revoking', async () => {
            await expectFailedRevocation(
              { eas, eip712Utils, eip712ProxyUtils },
              schemaId,
              { uid },
              { signatureType, from: sender },
              'Irrevocable'
            );

            await expectFailedMultiRevocations(
              { eas, eip712Utils, eip712ProxyUtils },
              [{ schema: schemaId, requests: [{ uid }, { uid: uids[0] }] }],
              { signatureType, from: sender },
              'Irrevocable'
            );

            await expectFailedMultiRevocations(
              { eas, eip712Utils, eip712ProxyUtils },
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

            ({ uid } = await expectAttestation(
              { eas, eip712Utils, eip712ProxyUtils },
              schema2Id,
              { recipient: ZERO_ADDRESS, expirationTime, revocable: false, data: encodeBytes32String('0') },
              { signatureType, from: sender }
            ));

            uids = [];

            for (let i = 0; i < 2; i++) {
              const { uid: newUid } = await expectAttestation(
                { eas, eip712Utils, eip712ProxyUtils },
                schema2Id,
                {
                  recipient: ZERO_ADDRESS,
                  expirationTime,
                  revocable: false,
                  data: encodeBytes32String((i + 1).toString())
                },
                { signatureType, from: sender }
              );

              uids.push(newUid);
            }
          });

          it('should revert when revoking', async () => {
            await expectFailedRevocation(
              { eas, eip712Utils, eip712ProxyUtils },
              schema2Id,
              { uid },
              { signatureType, from: sender },
              'Irrevocable'
            );

            await expectFailedMultiRevocations(
              { eas, eip712Utils, eip712ProxyUtils },
              [{ schema: schema2Id, requests: [{ uid }, { uid: uids[0] }] }],
              { signatureType, from: sender },
              'Irrevocable'
            );

            await expectFailedMultiRevocations(
              { eas, eip712Utils, eip712ProxyUtils },
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
            recipient: await recipient.getAddress(),
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
            recipient: await recipient.getAddress(),
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
                r: encodeBytes32String('1'),
                s: encodeBytes32String('2')
              }
            ],
            revoker: await sender.getAddress()
          }
        ])
      ).to.be.revertedWithCustomError(eas, 'InvalidLength');

      await expect(
        eas.multiRevokeByDelegation([
          {
            schema: schemaId,
            data: [],
            signatures: [
              {
                v: 28,
                r: encodeBytes32String('1'),
                s: encodeBytes32String('2')
              }
            ],
            revoker: await sender.getAddress()
          }
        ])
      ).to.be.revertedWithCustomError(eas, 'InvalidLength');

      await expect(
        eas.multiRevokeByDelegation([
          {
            schema: schemaId,
            data: [{ uid, value: 0 }],
            signatures: [
              {
                v: 28,
                r: encodeBytes32String('1'),
                s: encodeBytes32String('2')
              },
              {
                v: 28,
                r: encodeBytes32String('3'),
                s: encodeBytes32String('4')
              }
            ],
            revoker: await sender.getAddress()
          }
        ])
      ).to.be.revertedWithCustomError(eas, 'InvalidLength');

      await expect(
        eas.multiRevokeByDelegation([
          {
            schema: schemaId,
            data: [
              { uid, value: 0 },
              { uid: uid2, value: 0 }
            ],
            signatures: [],
            revoker: await sender.getAddress()
          }
        ])
      ).to.be.revertedWithCustomError(eas, 'InvalidLength');
    });
  });

  describe('timestamping', () => {
    const expectTimestamp = async (data: string | string[]) => {
      const res = Array.isArray(data) ? await eas.multiTimestamp(data) : await eas.timestamp(data);
      const timestamp = await eas.getTime();

      for (const item of Array.isArray(data) ? data : [data]) {
        await expect(res).to.emit(eas, 'Timestamped').withArgs(item, timestamp);

        expect(await eas.getTimestamp(item)).to.equal(timestamp);
      }
    };

    const data1 = encodeBytes32String('0x1234');
    const data2 = encodeBytes32String('0x4567');
    const data3 = encodeBytes32String('0x6666');
    const data4 = encodeBytes32String('Hello World');
    const data5 = encodeBytes32String('0x8888');

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

      await expect(eas.timestamp(data)).to.be.revertedWithCustomError(eas, 'AlreadyTimestamped');
    });

    it('should revert when attempting to timestamp the same multiple data twice', async () => {
      const data = [data1, data4];
      await expectTimestamp(data);

      await expect(eas.multiTimestamp(data)).to.be.revertedWithCustomError(eas, 'AlreadyTimestamped');
      await expect(eas.multiTimestamp([data3, ...data])).to.be.revertedWithCustomError(eas, 'AlreadyTimestamped');
    });

    it("should return 0 for any data that wasn't timestamped", async () => {
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
        await expect(res)
          .to.emit(eas, 'RevokedOffchain')
          .withArgs(await sender.getAddress(), item, timestamp);
        expect(await eas.getRevokeOffchain(await sender.getAddress(), item)).to.equal(timestamp);
      }
    };

    const data1 = encodeBytes32String('0x1234');
    const data2 = encodeBytes32String('0x4567');
    const data3 = encodeBytes32String('0x6666');
    const data4 = encodeBytes32String('Hello World');
    const data5 = encodeBytes32String('0x8888');

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

      await expect(eas.connect(sender).revokeOffchain(data)).to.be.revertedWithCustomError(
        eas,
        'AlreadyRevokedOffchain'
      );
    });

    it('should not revert when attempting to revoke the same data twice with two different accounts', async () => {
      const data = data1;
      await expectRevoke(data);

      await expect(eas.connect(sender2).revokeOffchain(data)).to.not.be.revertedWithCustomError(
        eas,
        'AlreadyRevokedOffchain'
      );
    });

    it('should revert when attempting to timestamp the same multiple data twice', async () => {
      const data = [data1, data4];
      await expectRevoke(data);

      await expect(eas.connect(sender).multiRevokeOffchain(data)).to.be.revertedWithCustomError(
        eas,
        'AlreadyRevokedOffchain'
      );
      await expect(eas.connect(sender).multiRevokeOffchain([data3, ...data])).to.be.revertedWithCustomError(
        eas,
        'AlreadyRevokedOffchain'
      );
    });

    it("should return 0 for any data that wasn't timestamped", async () => {
      expect(await eas.getRevokeOffchain(await sender.getAddress(), data5)).to.equal(0);
    });
  });
});
