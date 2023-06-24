# Ethereum Attestation Service

[![Docs](https://img.shields.io/badge/docs-%F0%9F%93%84-blue)](https://eas.eth.link)
[![NPM Package](https://img.shields.io/npm/v/@ethereum-attestation-service/eas-contracts.svg)](https://www.npmjs.org/package/@ethereum-attestation-service/eas-contracts)
[![Test](https://github.com/ethereum-attestation-service/eas-contracts/actions/workflows/ci.yml/badge.svg)](https://github.com/ethereum-attestation-service/eas-contracts/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/ethereum-attestation-service/eas-contracts?style=flat-square)](https://github.com/ethereum-attestation-service/eas-contracts/blob/master/LICENSE)

## Introduction

The Ethereum Attestation Service is a free and open protocol for on-chain attestations on EVM compatible blockchains. It is a generalized service that allows anyone to register a schema for their particular use case, and then make attestations following their schema.

Schemas can be registered using the `SchemaRegistry.sol` contract, and attestations are made using the `EAS.sol` contract.

In addition, we provide a resolver contract for advanced use cases, such as on-chain verification of attestation data, and also attaching payments to attestations (which makes a new suite of powerful web3 applications possible).

We also provide an SDK for developers.

On-chain attestations will enable a powerful new range of web3 applications, including:

* Identity
* Trust Scores
* Goodness Scores
* Credit Scores
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
* And many more!

## Deployments

Please note that you can also import and use the addresses directly in your code using the `@ethereum-attestation-service/eas-contracts/deployments` deployment artifacts corresponding to your desired network.

### Ethereum

#### v0.26

* **EAS**:
  * Contract: [0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587](https://etherscan.io/address/0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587)
  * Deployment and ABI: [EAS.json](./deployments/mainnet/EAS.json)
* **SchemaRegistry**:
  * Contract: [0xA7b39296258348C78294F95B872b282326A97BDF](https://etherscan.io/address/0xA7b39296258348C78294F95B872b282326A97BDF)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/mainnet/SchemaRegistry.json)

### Optimism

#### v0.28

* **EAS**:
  * Contract: [0xd64059A36EdC1e278BDAB1256bB887668Fe33151](https://optimistic.etherscan.io/address/0xd64059A36EdC1e278BDAB1256bB887668Fe33151)
  * Deployment and ABI: [EAS.json](./deployments/optimism/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x8889039Ce46B259d6E6ee761330faBf4ccC9Ea51](https://optimistic.etherscan.io/address/0x8889039Ce46B259d6E6ee761330faBf4ccC9Ea51)
  * Deployment and ABI: [SchemaRegistry.json](./deployments//optimism-goerli/SchemaRegistry.json)

### Arbitrum One

#### v0.26

* **EAS**:
  * Contract: [0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458](https://arbiscan.io/address/0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458)
  * Deployment and ABI: [EAS.json](./deployments/arbitrum-one/EAS.json)
* **SchemaRegistry**:
  * Contract: [0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB](https://arbiscan.io/address/0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/arbitrum-one/SchemaRegistry.json)

### Sepolia

#### v0.26

* **EAS**:
  * Contract: [0xC2679fBD37d54388Ce493F1DB75320D236e1815e](https://sepolia.etherscan.io/address/0xC2679fBD37d54388Ce493F1DB75320D236e1815e)
  * Deployment and ABI: [EAS.json](./deployments/sepolia/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0](https://sepolia.etherscan.io/address/0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/sepolia/SchemaRegistry.json)

### Optimism Goerli

#### v0.27

* **EAS**:
  * Contract: [0x1a5650d0ecbca349dd84bafa85790e3e6955eb84](https://goerli-optimism.etherscan.io/address/0x1a5650D0EcbCa349DD84bAFa85790E3e6955eb84)
  * Deployment and ABI: [EAS.json](./deployments/optimism-goerli/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x7b24C7f8AF365B4E308b6acb0A7dfc85d034Cb3f](https://goerli-optimism.etherscan.io/address/0x7b24C7f8AF365B4E308b6acb0A7dfc85d034Cb3f)
  * Deployment and ABI: [SchemaRegistry.json](./deployments//optimism-goerli/SchemaRegistry.json)

### Base Goerli

#### v0.27

* **EAS**:
  * Contract: [0xAcfE09Fd03f7812F022FBf636700AdEA18Fd2A7A](https://goerli.basescan.org//address/0xAcfE09Fd03f7812F022FBf636700AdEA18Fd2A7A)
  * Deployment and ABI: [EAS.json](./deployments/base-goerli/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x720c2bA66D19A725143FBf5fDC5b4ADA2742682E](https://goerli.basescan.org//address/0x720c2bA66D19A725143FBf5fDC5b4ADA2742682E)
  * Deployment and ABI: [SchemaRegistry.json](./deployments//base-goerli/SchemaRegistry.json)

## Installation

```sh
yarn add @ethereum-attestation-service/eas-contracts
```

## Testing

Testing the protocol is possible via multiple approaches:

### Unit Tests

You can run the full test suite via:

```sh
yarn test
```

### Deployment Tests

You can test new deployments (and the health of the network) against a mainnet fork via:

```sh
yarn test:deploy
```

Please make sure to properly configure your Tenderly settings via `.env`.

This will automatically be skipped on an already deployed and configured deployment scripts and will only test the additional changeset resulting by running any new/pending deployment scripts and perform an e2e test against the up to date state. This is especially useful to verify that any future deployments and upgrades, suggested by the DAO, work correctly and preserve the integrity of the system.

### Test Coverage

#### Latest Test Coverage Report (2023-01-26)

* 100% Statements 207/207
* 100% Branches 110/110
* 100% Functions 74/74
* 100% Lines 333/333

```sh
------------------------------|----------|----------|----------|----------|----------------|
File                          |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
------------------------------|----------|----------|----------|----------|----------------|
 contracts/                   |      100 |      100 |      100 |      100 |                |
  EAS.sol                     |      100 |      100 |      100 |      100 |                |
  EIP712Verifier.sol          |      100 |      100 |      100 |      100 |                |
  IEAS.sol                    |      100 |      100 |      100 |      100 |                |
  ISchemaRegistry.sol         |      100 |      100 |      100 |      100 |                |
  SchemaRegistry.sol          |      100 |      100 |      100 |      100 |                |
  Types.sol                   |      100 |      100 |      100 |      100 |                |
 contracts/resolver/          |      100 |      100 |      100 |      100 |                |
  ISchemaResolver.sol         |      100 |      100 |      100 |      100 |                |
  SchemaResolver.sol          |      100 |      100 |      100 |      100 |                |
 contracts/resolver/examples/ |      100 |      100 |      100 |      100 |                |
  AttestationResolver.sol     |      100 |      100 |      100 |      100 |                |
  AttesterResolver.sol        |      100 |      100 |      100 |      100 |                |
  DataResolver.sol            |      100 |      100 |      100 |      100 |                |
  ExpirationTimeResolver.sol  |      100 |      100 |      100 |      100 |                |
  PayingResolver.sol          |      100 |      100 |      100 |      100 |                |
  RecipientResolver.sol       |      100 |      100 |      100 |      100 |                |
  RevocationResolver.sol      |      100 |      100 |      100 |      100 |                |
  TokenResolver.sol           |      100 |      100 |      100 |      100 |                |
  ValueResolver.sol           |      100 |      100 |      100 |      100 |                |
------------------------------|----------|----------|----------|----------|----------------|
All files                     |      100 |      100 |      100 |      100 |                |
------------------------------|----------|----------|----------|----------|----------------|
```

#### Instructions

In order to audit the test coverage of the full test suite, run:

```sh
yarn test:coverage
```

## Profiling

You can profile the gas costs of all of the user-focused flows via:

```sh
yarn test:profile
```

## Deploying

The contracts have built-in support for deployments on different chains and mainnet forks. You can deploy the project by:

```sh
yarn deploy
```

There’s also a special deployment mode which deploys the protocol to a mainnet fork, with additional goodies. It can be run via:

```sh
yarn deploy:fork
```

The framework was inspired and adopted from [Bancor V3](https://github.com/bancorprotocol/contracts-v3).

## License

EAS is open source and distributed under the MIT License (see [`LICENSE`](./LICENSE)).
