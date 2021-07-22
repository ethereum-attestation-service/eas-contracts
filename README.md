# Ethereum Attestation Service

[![Docs](https://img.shields.io/badge/docs-%F0%9F%93%84-blue)](https://eas.eth.link)
[![NPM Package](https://img.shields.io/npm/v/@ethereum-attestation-service/contracts.svg)](https://www.npmjs.org/package/@ethereum-attestation-service/contracts)
[![Test](https://github.com/ethereum-attestation-service/contracts/actions/workflows/workflow.yml/badge.svg)](https://github.com/ethereum-attestation-service/contracts/actions/workflows/workflow.yml)

## Introduction

Why don’t we have any widely adopted identity, reputation, or voting systems on Ethereum? We have seen many proposed solutions to the above, but each has tried to build very specific ecosystems for their respective use cases. This approach creates fragmentation across all of these different platforms and smart contracts, and they do not take every possible use case into account. We propose a more fundamental base layer for all possible attestation-based interactions called the Ethereum Attestation Service. EAS solves the interoperability problem for all trust and identity services being built today and in the future.

Much like Ethereum is the base layer for Dapps and smart contracts, EAS is the base layer for attestations. What is an EAS attestation? An EAS attestation can be anyone or anything attesting to anything or anyone about anything. Whether it’s a person attesting to a positive experience they had at a restaurant, a KYC service attesting to someone’s identity, someone attesting a vote to a presidential candidate, or a cell phone verification company attesting to you having a unique cell phone number. Any possible service you imagine can be built, and all connect using EAS as the base layer.

EAS is made up of two very simple smart contracts. The base EAS contract which allows anyone in the world to make and record an attestation, as well as an attestation schema registry contract that allows anyone to register a new attestation schema.

## Deployments

### Rinkeby

#### v0.4

- **EAS**: <https://rinkeby.etherscan.io/address/0xEA50419ABE0EE0021B4e6147bEdB8cB8D262CC00>
- **ASRegistry**: <https://rinkeby.etherscan.io/address/0x19Db734420DC973A078561F4310415a5F86d1641>
- **EIP712Verifier**: <https://rinkeby.etherscan.io/address/0xdfC2d8F81cac977C0C8DF8C3b2b74030A8143599>

## Installation

```console
yarn install @ethereum-attestation-service/contracts
```

## License

EAS is open source and distributed under the MIT License (see [`LICENSE`](./LICENSE)).
