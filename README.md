# Ethereum Attestation Service

[![Docs](https://img.shields.io/badge/docs-%F0%9F%93%84-blue)](https://eas.eth.link)
[![NPM Package](https://img.shields.io/npm/v/@ethereum-attestation-service/contracts.svg)](https://www.npmjs.org/package/@ethereum-attestation-service/contracts)
[![Test](https://github.com/ethereum-attestation-service/contracts/actions/workflows/workflow.yml/badge.svg)](https://github.com/ethereum-attestation-service/contracts/actions/workflows/workflow.yml)
[![License](https://img.shields.io/github/license/ethereum-attestation-service/eas-contracts?style=flat-square)](https://github.com/ethereum-attestation-service/eas-contracts/blob/master/LICENSE)

## Introduction

The Ethereum Attestation Service is a free and open protocol for on-chain attestations on EVM compatible blockchains.  It is a generalized service that allows anyone to register a schema for their particular use case, and then make attestations following their schema.

Schemas can be registered using the Schema.sol contract, and attestations are made using the EAS.sol contract.

In addition, we provide a resolver contract for advanced use cases, such as on-chain verification of attestation data, and also attaching payments to attestations (which makes a new suite of powerful web3 applications possible)

We also provide an SDK for developers.

On-chain attestations will enable a powerful new range of web3 applications, including:

* Identity
* Trust Scores
* Goodness ScoresCredit Scores
* Clout
* Land Registries
* Social Networks
* Portable Trust Layers
* Retroactive Public Goods Funding
* KYC Services
* Uncollateralized Lending / Borrowing
* Voting
* Oracles (who can be atomically paid for making attestations inside the protocol)
* Likes/Dislikes
* Content Filtering
* And many more !

## Deployments

### Rinkeby

#### v0.6

* **EAS**: <https://rinkeby.etherscan.io/address/0xBf49E19254DF70328C6696135958C94CD6cd0430>
* **ASRegistry**: <https://rinkeby.etherscan.io/address/0xd8B7EC70d53b11e130fba78fBED97862eF2a13f0>
* **EIP712Verifier**: <https://rinkeby.etherscan.io/address/0xa05e3Ca02C8437E99018E55cC3920FD79f4FD624>

## Installation

```console
yarn install @ethereum-attestation-service/contracts
```

## License

EAS is open source and distributed under the MIT License (see [`LICENSE`](./LICENSE)).
