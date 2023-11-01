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

### Mainnets

#### Ethereum

Version 0.26:

* **EAS**:
  * Contract: [0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587](https://etherscan.io/address/0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587)
  * Deployment and ABI: [EAS.json](./deployments/mainnet/EAS.json)
* **SchemaRegistry**:
  * Contract: [0xA7b39296258348C78294F95B872b282326A97BDF](https://etherscan.io/address/0xA7b39296258348C78294F95B872b282326A97BDF)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/mainnet/SchemaRegistry.json)

#### Arbitrum One

Version 0.26:

* **EAS**:
  * Contract: [0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458](https://arbiscan.io/address/0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458)
  * Deployment and ABI: [EAS.json](./deployments/arbitrum-one/EAS.json)
* **SchemaRegistry**:
  * Contract: [0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB](https://arbiscan.io/address/0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/arbitrum-one/SchemaRegistry.json)

#### Optimism

Version 1.0.1:

* **EAS**:
  * Contract: [0x4200000000000000000000000000000000000021](https://optimistic.etherscan.io/address/0x4200000000000000000000000000000000000021)
  * Deployment and ABI: [EAS.json](./deployments/optimism/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x4200000000000000000000000000000000000020](https://optimistic.etherscan.io/address/0x4200000000000000000000000000000000000020)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/optimism/SchemaRegistry.json)

Version 1.2.0:

* **EIP712Proxy**:
  * Contract: [0xE132c2E90274B44FfD8090b58399D04ddc060AE1](https://optimistic.etherscan.io/address/0xE132c2E90274B44FfD8090b58399D04ddc060AE1)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/optimism/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x6dd0CB3C3711c8B5d03b3790e5339Bbc2Bbcf934](https://optimistic.etherscan.io/address/0x6dd0CB3C3711c8B5d03b3790e5339Bbc2Bbcf934)
  * Deployment and ABI: [Indexer.json](./deployments/optimism/Indexer.json)

#### Base

Version 1.0.1:

* **EAS**:
  * Contract: [0x4200000000000000000000000000000000000021](https://basescan.org/address/0x4200000000000000000000000000000000000021)
  * Deployment and ABI: [EAS.json](./deployments/base/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x4200000000000000000000000000000000000020](https://basescan.org/address/0x4200000000000000000000000000000000000020)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/base/SchemaRegistry.json)

Version 1.2.0:

* **EIP712Proxy**:
  * Contract: [0xF095fE4b23958b08D38e52d5d5674bBF0C03cbF6](https://basescan.org/address/0xF095fE4b23958b08D38e52d5d5674bBF0C03cbF6)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/base/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x37AC6006646f2e687B7fB379F549Dc7634dF5b84](https://basescan.org/address/0x37AC6006646f2e687B7fB379F549Dc7634dF5b84)
  * Deployment and ABI: [Indexer.json](./deployments/base/Indexer.json)

#### Linea

Version 1.2.0:

* **EAS**:
  * Contract: [0xaEF4103A04090071165F78D45D83A0C0782c2B2a](https://lineascan.build/address/0xaEF4103A04090071165F78D45D83A0C0782c2B2a)
  * Deployment and ABI: [EAS.json](./deployments/linea/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797](https://lineascan.build/address/0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/linea/SchemaRegistry.json)

### Testnets

#### Sepolia

Version 0.26:

* **EAS**:
  * Contract: [0xC2679fBD37d54388Ce493F1DB75320D236e1815e](https://sepolia.etherscan.io/address/0xC2679fBD37d54388Ce493F1DB75320D236e1815e)
  * Deployment and ABI: [EAS.json](./deployments/sepolia/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0](https://sepolia.etherscan.io/address/0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/sepolia/SchemaRegistry.json)

Version 1.2.0:

* **EIP712Proxy**:
  * Contract: [0x9C9d17bEE150E4eCDf3b99baFA62c08Cb30E82BC](https://sepolia.etherscan.io/address/0x9C9d17bEE150E4eCDf3b99baFA62c08Cb30E82BC)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/sepolia/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0xaEF4103A04090071165F78D45D83A0C0782c2B2a](https://sepolia.etherscan.io/address/0xaEF4103A04090071165F78D45D83A0C0782c2B2a)
  * Deployment and ABI: [Indexer.json](./deployments/sepolia/Indexer.json)

0xaEF4103A04090071165F78D45D83A0C0782c2B2a

#### Optimism Goerli

Version 1.0.1:

* **EAS**:
  * Contract: [0x4200000000000000000000000000000000000021](https://goerli-optimism.etherscan.io/address/0x4200000000000000000000000000000000000021)
  * Deployment and ABI: [EAS.json](./deployments/optimism-goerli/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x4200000000000000000000000000000000000020](https://goerli-optimism.etherscan.io/address/0x4200000000000000000000000000000000000020)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/optimism-goerli/SchemaRegistry.json)

Version 1.2.0:

* **EIP712Proxy**:
  * Contract: [0x88D1bd62AC014424b987CE5ABf311BD7749e426B](https://goerli-optimism.etherscan.io/address/0x88D1bd62AC014424b987CE5ABf311BD7749e426B)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/optimism-goerli/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0xa42428D1bf904d762adD02b27ADac26d53643782](https://goerli-optimism.etherscan.io/address/0xa42428D1bf904d762adD02b27ADac26d53643782)
  * Deployment and ABI: [Indexer.json](./deployments/optimism-goerli/Indexer.json)

#### Base Goerli

Version 1.0.1:

* **EAS**:
  * Contract: [0x4200000000000000000000000000000000000021](https://goerli.basescan.org/address/0x4200000000000000000000000000000000000021)
  * Deployment and ABI: [EAS.json](./deployments/base-goerli/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x4200000000000000000000000000000000000020](https://goerli.basescan.org/address/0x4200000000000000000000000000000000000020)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/base-goerli/SchemaRegistry.json)

Version 1.2.0:

* **EIP712Proxy**:
  * Contract: [0x37AC6006646f2e687B7fB379F549Dc7634dF5b84](https://goerli.basescan.org/address/0x37AC6006646f2e687B7fB379F549Dc7634dF5b84)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/base-goerli/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0xE0893F47009776D6aEC3De8455Cb0ed325Eea74a](https://goerli.basescan.org/address/0xE0893F47009776D6aEC3De8455Cb0ed325Eea74a)
  * Deployment and ABI: [Indexer.json](./deployments/base-goerli/Indexer.json)

#### Arbitrum Goerli

Version 1.1.0:

* **EAS**:
  * Contract: [0xaEF4103A04090071165F78D45D83A0C0782c2B2a](https:/goerli.arbiscan.io/address/0xaEF4103A04090071165F78D45D83A0C0782c2B2a)
  * Deployment and ABI: [EAS.json](./deployments/arbitrum-goerli/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797](https:/goerli.arbiscan.io/address/0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/arbitrum-goerli/SchemaRegistry.json)

#### Polygon Mumbai

Version 1.2.0:

* **EAS**:
  * Contract: [0xaEF4103A04090071165F78D45D83A0C0782c2B2a](https://mumbai.polygonscan.com/address/0xaEF4103A04090071165F78D45D83A0C0782c2B2a)
  * Deployment and ABI: [EAS.json](./deployments/polygon-mumbai/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797](https://mumbai.polygonscan.com/address/0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/polygon-mumbai/SchemaRegistry.json)

#### Linea Goerli

Version 1.2.0:

* **EAS**:
  * Contract: [0xaEF4103A04090071165F78D45D83A0C0782c2B2a](https://goerli.lineascan.build/address/0xaEF4103A04090071165F78D45D83A0C0782c2B2a)
  * Deployment and ABI: [EAS.json](./deployments/linea-goerli/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797](https://goerli.lineascan.build/address/0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/linea-goerli/SchemaRegistry.json)

## Installation

```sh
pnpm add @ethereum-attestation-service/eas-contracts
```

## Testing

Testing the protocol is possible via multiple approaches:

### Unit Tests

You can run the full test suite via:

```sh
pnpm test
```

### Test Coverage

#### Latest Test Coverage Report (2023-10-31)

* 100% Statements 350/350
* 100% Branches 172/172
* 100% Functions 120/120
* 100% Lines 491/491

```sh
----------------------------------|----------|----------|----------|----------|----------------|
File                              |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
----------------------------------|----------|----------|----------|----------|----------------|
 contracts/                       |      100 |      100 |      100 |      100 |                |
  Common.sol                      |      100 |      100 |      100 |      100 |                |
  EAS.sol                         |      100 |      100 |      100 |      100 |                |
  IEAS.sol                        |      100 |      100 |      100 |      100 |                |
  ISchemaRegistry.sol             |      100 |      100 |      100 |      100 |                |
  Indexer.sol                     |      100 |      100 |      100 |      100 |                |
  SchemaRegistry.sol              |      100 |      100 |      100 |      100 |                |
  Semver.sol                      |      100 |      100 |      100 |      100 |                |
 contracts/eip1271/               |      100 |      100 |      100 |      100 |                |
  EIP1271Verifier.sol             |      100 |      100 |      100 |      100 |                |
 contracts/eip712/proxy/          |      100 |      100 |      100 |      100 |                |
  EIP712Proxy.sol                 |      100 |      100 |      100 |      100 |                |
 contracts/eip712/proxy/examples/ |      100 |      100 |      100 |      100 |                |
  PermissionedEIP712Proxy.sol     |      100 |      100 |      100 |      100 |                |
 contracts/resolver/              |      100 |      100 |      100 |      100 |                |
  ISchemaResolver.sol             |      100 |      100 |      100 |      100 |                |
  SchemaResolver.sol              |      100 |      100 |      100 |      100 |                |
 contracts/resolver/examples/     |      100 |      100 |      100 |      100 |                |
  AttestationResolver.sol         |      100 |      100 |      100 |      100 |                |
  AttesterResolver.sol            |      100 |      100 |      100 |      100 |                |
  DataResolver.sol                |      100 |      100 |      100 |      100 |                |
  ExpirationTimeResolver.sol      |      100 |      100 |      100 |      100 |                |
  PayingResolver.sol              |      100 |      100 |      100 |      100 |                |
  RecipientResolver.sol           |      100 |      100 |      100 |      100 |                |
  RevocationResolver.sol          |      100 |      100 |      100 |      100 |                |
  TokenResolver.sol               |      100 |      100 |      100 |      100 |                |
  ValueResolver.sol               |      100 |      100 |      100 |      100 |                |
----------------------------------|----------|----------|----------|----------|----------------|
All files                         |      100 |      100 |      100 |      100 |                |
----------------------------------|----------|----------|----------|----------|----------------|
```

#### Instructions

In order to audit the test coverage of the full test suite, run:

```sh
pnpm test:coverage
```

## Profiling

You can profile the gas costs of all of the user-focused flows via:

```sh
pnpm test:profile
```

## Deploying

The contracts have built-in support for deployments on different chains and mainnet forks. You can deploy the project by:

```sh
pnpm deploy
```

There’s also a special deployment mode which deploys the protocol to a mainnet fork, with additional goodies. It can be run via:

```sh
pnpm deploy:fork
```

The framework was inspired and adopted from [Bancor V3](https://github.com/bancorprotocol/contracts-v3).

## License

EAS is open source and distributed under the MIT License (see [`LICENSE`](./LICENSE)).
