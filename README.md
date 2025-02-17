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

#### Arbitrum One

Version 0.26:

* **EAS**:
  * Contract: [0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458](https://arbiscan.io/address/0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458)
  * Deployment and ABI: [EAS.json](./deployments/arbitrum-one/EAS.json)
* **SchemaRegistry**:
  * Contract: [0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB](https://arbiscan.io/address/0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/arbitrum-one/SchemaRegistry.json)

#### Arbitrum Nova

Version 1.3.0:

* **EAS**:
  * Contract: [0x6d3dC0Fe5351087E3Af3bDe8eB3F7350ed894fc3](https://nova.arbiscan.io/address/0x6d3dC0Fe5351087E3Af3bDe8eB3F7350ed894fc3)
  * Deployment and ABI: [EAS.json](./deployments/arbitrum-nova/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x49563d0DA8DF38ef2eBF9C1167270334D72cE0AE](https://nova.arbiscan.io/address/0x49563d0DA8DF38ef2eBF9C1167270334D72cE0AE)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/arbitrum-nova/SchemaRegistry.json)
* **EIP712Proxy**:
  * Contract: [0xEbf2DeeD690F8A68b8248d6a12231ee70ED2154A](https://nova.arbiscan.io/address/0xEbf2DeeD690F8A68b8248d6a12231ee70ED2154A)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/arbitrum-nova/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x7182Be5e84aFEe9Dc29C69D081F8A0FA834d6CB8](https://nova.arbiscan.io/address/0x7182Be5e84aFEe9Dc29C69D081F8A0FA834d6CB8)
  * Deployment and ABI: [Indexer.json](./deployments/arbitrum-nova/Indexer.json)

#### Polygon

Version 1.3.0:

* **EAS**:
  * Contract: [0x5E634ef5355f45A855d02D66eCD687b1502AF790](https://polygonscan.com/address/0x5E634ef5355f45A855d02D66eCD687b1502AF790)
  * Deployment and ABI: [EAS.json](./deployments/polygon/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x7876EEF51A891E737AF8ba5A5E0f0Fd29073D5a7](https://polygonscan.com/address/0x7876EEF51A891E737AF8ba5A5E0f0Fd29073D5a7)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/polygon/SchemaRegistry.json)
* **EIP712Proxy**:
  * Contract: [0x4be71865917C7907ccA531270181D9B7dD4f2733](https://polygonscan.com/address/0x4be71865917C7907ccA531270181D9B7dD4f2733)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/polygon/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x12d0f50Eb2d67b14293bdDA2C248358f3dfE5308](https://polygonscan.com/address/0x12d0f50Eb2d67b14293bdDA2C248358f3dfE5308)
  * Deployment and ABI: [Indexer.json](./deployments/polygon/Indexer.json)

#### Scroll

Version 1.3.0:

* **EAS**:
  * Contract: [0xC47300428b6AD2c7D03BB76D05A176058b47E6B0](https://scrollscan.com/address/0xC47300428b6AD2c7D03BB76D05A176058b47E6B0)
  * Deployment and ABI: [EAS.json](./deployments/scroll/EAS.json)
* **SchemaRegistry**:
  * Contract: [0xD2CDF46556543316e7D34e8eDc4624e2bB95e3B6](https://scrollscan.com/address/0xD2CDF46556543316e7D34e8eDc4624e2bB95e3B6)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/scroll/SchemaRegistry.json)
* **EIP712Proxy**:
  * Contract: [0x77b7DA1c40762Cd8AFfE2069b575328EfD4D9801](https://scrollscan.com/address/0x77b7DA1c40762Cd8AFfE2069b575328EfD4D9801)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/scroll/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x8314bc1B2f7F286cb4f0323FE7119C0F99D4A083](https://scrollscan.com/address/0x8314bc1B2f7F286cb4f0323FE7119C0F99D4A083)
  * Deployment and ABI: [Indexer.json](./deployments/scroll/Indexer.json)

#### zkSync

Version 1.3.0:

* **EAS**:
  * Contract: [0x21d8d4eE83b80bc0Cc0f2B7df3117Cf212d02901](https://explorer.zksync.io/address/0x21d8d4eE83b80bc0Cc0f2B7df3117Cf212d02901)
  * Deployment and ABI: [EAS.json](./deployments/zksync/EAS.json)
* **SchemaRegistry**:
  * Contract: [0xB8566376dFe68B76FA985D5448cc2FbD578412a2](https://explorer.zksync.io/address/0xB8566376dFe68B76FA985D5448cc2FbD578412a2)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/zksync/SchemaRegistry.json)
* **EIP712Proxy**:
  * Contract: [0x8E8F79e9A1Cd4da7bD2f15e5B0a4B4a613E37C5a](https://explorer.zksync.io/address/0x8E8F79e9A1Cd4da7bD2f15e5B0a4B4a613E37C5a)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/zksync/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x8AdA7852df64A66ca89EFc82144e6be71Bd53B4E](https://explorer.zksync.io/address/0x8AdA7852df64A66ca89EFc82144e6be71Bd53B4E)
  * Deployment and ABI: [Indexer.json](./deployments/zksync/Indexer.json)

#### Celo

Version 1.3.0:

* **EAS**:
  * Contract: [0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92](https://celoscan.io/address/0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92)
  * Deployment and ABI: [EAS.json](./deployments/celo/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x5ece93bE4BDCF293Ed61FA78698B594F2135AF34](https://celoscan.io/address/0x5ece93bE4BDCF293Ed61FA78698B594F2135AF34)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/celo/SchemaRegistry.json)
* **EIP712Proxy**:
  * Contract: [0x6792B6AE17c6416016b943585e957a29bc452806](https://celoscan.io/address/0x6792B6AE17c6416016b943585e957a29bc452806)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/celo/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x76591b332d0F099E89FA335fC827D44C47705D2f](https://celoscan.io/address/0x76591b332d0F099E89FA335fC827D44C47705D2f)
  * Deployment and ABI: [Indexer.json](./deployments/celo/Indexer.json)

#### Telos

Version 1.4.0:

* **EAS**:
  * Contract: [0x9898C3FF2fdCA9E734556fC4BCCd5b9239218155](https://teloscan.io/address/0x9898C3FF2fdCA9E734556fC4BCCd5b9239218155)
  * Deployment and ABI: [EAS.json](./deployments/telos/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x842511adC21B85C0B2fdB02AAcFA92fdf7Cda470](https://teloscan.io/address/0x842511adC21B85C0B2fdB02AAcFA92fdf7Cda470)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/telos/SchemaRegistry.json)
* **EIP712Proxy**:
  * Contract: [0xA76973759A350D4D7EC7aF042c6c2A32be861AD9](https://teloscan.io/address/0xA76973759A350D4D7EC7aF042c6c2A32be861AD9)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/telos/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x6Abe1F9489B97d9f11E1347567f61137BC61B6F9](https://teloscan.io/address/0x6Abe1F9489B97d9f11E1347567f61137BC61B6F9)
  * Deployment and ABI: [Indexer.json](./deployments/telos/Indexer.json)

#### Soneium

Version 1.4.1-beta.1:

* **EAS**:
  * Contract: [0x4200000000000000000000000000000000000021](https://soneium.blockscout.com/address/0x4200000000000000000000000000000000000021)
  * Deployment and ABI: [EAS.json](./deployments/soneium/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x4200000000000000000000000000000000000020](https://soneium.blockscout.com/address/0x4200000000000000000000000000000000000020)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/soneium/SchemaRegistry.json)
* **EIP712Proxy**:
  * Contract: [0x465a34dd6dDb5DF22DBC67D005b5BF4a0BF7f8AE](https://soneium.blockscout.com/address/0x465a34dd6dDb5DF22DBC67D005b5BF4a0BF7f8AE)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/soneium/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x16613642e9793d413c296f9AB5457077b99AA7B0](https://soneium.blockscout.com/address/0x16613642e9793d413c296f9AB5457077b99AA7B0)
  * Deployment and ABI: [Indexer.json](./deployments/soneium/Indexer.json)

#### Ink

Version 1.4.1-beta.1:

* **EAS**:
  * Contract: [0x4200000000000000000000000000000000000021](https://explorer.inkonchain.com/address/0x4200000000000000000000000000000000000021)
  * Deployment and ABI: [EAS.json](./deployments/ink/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x4200000000000000000000000000000000000020](https://explorer.inkonchain.com/address/0x4200000000000000000000000000000000000020)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/ink/SchemaRegistry.json)
* **EIP712Proxy**:
  * Contract: [0x6511967899445c5944f555Fe2B2D5EC4D74d2579](https://explorer.inkonchain.com/address/0x6511967899445c5944f555Fe2B2D5EC4D74d2579)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/ink/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0xd87dCB0E5E0044Ba5Aa57D383cd3f8D0509a42b9](https://explorer.inkonchain.com/address/0xd87dCB0E5E0044Ba5Aa57D383cd3f8D0509a42b9)
  * Deployment and ABI: [Indexer.json](./deployments/ink/Indexer.json)

#### Unichain

Version 1.4.1-beta.1:

* **EAS**:
  * Contract: [0x4200000000000000000000000000000000000021](https://uniscan.xyz/address/0x4200000000000000000000000000000000000021)
  * Deployment and ABI: [EAS.json](./deployments/unichain/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x4200000000000000000000000000000000000020](https://uniscan.xyz/address/0x4200000000000000000000000000000000000020)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/unichain/SchemaRegistry.json)
* **EIP712Proxy**:
  * Contract: [0x65c83e3C5f1505C4220B2f57815285Dc58464088](https://uniscan.xyz/address/0x65c83e3C5f1505C4220B2f57815285Dc58464088)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/unichain/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0xE6afd49f7beF444e39BFDFbB6BE63119a8BdE88F](https://uniscan.xyz/address/0xE6afd49f7beF444e39BFDFbB6BE63119a8BdE88F)
  * Deployment and ABI: [Indexer.json](./deployments/unichain/Indexer.json)

#### Blast

Version 1.3.0:

* **EAS**:
  * Contract: [0x4200000000000000000000000000000000000021](https://blastscan.io/address/0x4200000000000000000000000000000000000021)
  * Deployment and ABI: [EAS.json](./deployments/blast/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x4200000000000000000000000000000000000020](https://blastscan.io/address/0x4200000000000000000000000000000000000020)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/blast/SchemaRegistry.json)

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

#### Optimism Sepolia

Version 1.0.2:

* **EAS**:
  * Contract: [0x4200000000000000000000000000000000000021](https://sepolia-optimism.etherscan.io/address/0x4200000000000000000000000000000000000021)
  * Deployment and ABI: [EAS.json](./deployments/optimism-sepolia/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x4200000000000000000000000000000000000020](https://sepolia-optimism.etherscan.io/address/0x4200000000000000000000000000000000000020)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/optimism-sepolia/SchemaRegistry.json)

Version 1.3.0:

* **EIP712Proxy**:
  * Contract: [0x37AC6006646f2e687B7fB379F549Dc7634dF5b84](https://sepolia-optimism.etherscan.io/address/0x37AC6006646f2e687B7fB379F549Dc7634dF5b84)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/optimism-sepolia/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x97e6822A36E38D4d93C0c810CC2be1C6Fd492b64](https://sepolia-optimism.etherscan.io/address/0x97e6822A36E38D4d93C0c810CC2be1C6Fd492b64)
  * Deployment and ABI: [Indexer.json](./deployments/optimism-sepolia/Indexer.json)

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

#### Base Sepolia

Version 1.2.0:

* **EAS**:
  * Contract: [0x4200000000000000000000000000000000000021](https://sepolia.basescan.org/address/0x4200000000000000000000000000000000000021)
  * Deployment and ABI: [EAS.json](./deployments/base-sepolia/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x4200000000000000000000000000000000000020](https://sepolia.basescan.org/address/0x4200000000000000000000000000000000000020)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/base-sepolia/SchemaRegistry.json)

Version 1.3.0:

* **EIP712Proxy**:
  * Contract: [0xAd64A04c20dDBbA7cBb0EcAe4823095B4adA5c57](https://sepolia.basescan.org/address/0xAd64A04c20dDBbA7cBb0EcAe4823095B4adA5c57)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/base-sepolia/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x2C7BCE69D5Ee84EF73CC9286416F68E60F9A61b3](https://sepolia.basescan.org/address/0x2C7BCE69D5Ee84EF73CC9286416F68E60F9A61b3)
  * Deployment and ABI: [Indexer.json](./deployments/base-sepolia/Indexer.json)

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

#### Arbitrum Sepolia

Version 1.3.0:

* **EAS**:
  * Contract: [0x2521021fc8BF070473E1e1801D3c7B4aB701E1dE](https:/sepolia.arbiscan.io/address/0x2521021fc8BF070473E1e1801D3c7B4aB701E1dE)
  * Deployment and ABI: [EAS.json](./deployments/arbitrum-sepolia/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x45CB6Fa0870a8Af06796Ac15915619a0f22cd475](https:/sepolia.arbiscan.io/address/0x45CB6Fa0870a8Af06796Ac15915619a0f22cd475)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/arbitrum-sepolia/SchemaRegistry.json)
* **EIP712Proxy**:
  * Contract: [0x8E807011c16E538B2dEEf1dc652EFe7724E09397](https://sepolia.arbiscan.io/address/0x8E807011c16E538B2dEEf1dc652EFe7724E09397)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/arbitrum-sepolia/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x501D6d86240De5A57E91414356ad4B1778F0AB18](https://sepolia.arbiscan.io/address/0x501D6d86240De5A57E91414356ad4B1778F0AB18)
  * Deployment and ABI: [Indexer.json](./deployments/arbitrum-sepolia/Indexer.json)

#### Polygon Amoy

Version 1.3.0:

* **EAS**:
  * Contract: [0xb101275a60d8bfb14529C421899aD7CA1Ae5B5Fc](https://amoy.polygonscan.com/address/0xb101275a60d8bfb14529C421899aD7CA1Ae5B5Fc)
  * Deployment and ABI: [EAS.json](./deployments/polygon-amoy/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x23c5701A1BDa89C61d181BD79E5203c730708AE7](https://amoy.polygonscan.com/address/0x23c5701A1BDa89C61d181BD79E5203c730708AE7)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/polygon-amoy/SchemaRegistry.json)
* **EIP712Proxy**:
  * Contract: [0xA0ec8a80a0b8496B9Cf6Ee703bC16ABdC9F4cf2e](https://amoy.polygonscan.com/address/0xA0ec8a80a0b8496B9Cf6Ee703bC16ABdC9F4cf2e)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/polygon-amoy/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x9F07c0B0E52C36D78Ac8ABfC543c77f83888ac64](https://amoy.polygonscan.com/address/0x9F07c0B0E52C36D78Ac8ABfC543c77f83888ac64)
  * Deployment and ABI: [Indexer.json](./deployments/polygon-amoy/Indexer.json)

#### Scroll Sepolia

Version 1.3.0:

* **EAS**:
  * Contract: [0xaEF4103A04090071165F78D45D83A0C0782c2B2a](https://sepolia.scrollscan.com/address/0xaEF4103A04090071165F78D45D83A0C0782c2B2a)
  * Deployment and ABI: [EAS.json](./deployments/scroll-sepolia/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797](https://sepolia.scrollscan.com/address/0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/scroll-sepolia/SchemaRegistry.json)
* **EIP712Proxy**:
  * Contract: [0xB3574f76b1720E61FdA98702c7016674CD6Eaa7b](https://sepolia.scrollscan.com/address/0xB3574f76b1720E61FdA98702c7016674CD6Eaa7b)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/scroll-sepolia/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x7C2cb1eDC328491da52de2a0afc44D3B0Ae7ee17](https://sepolia.scrollscan.com/address/0x7C2cb1eDC328491da52de2a0afc44D3B0Ae7ee17)
  * Deployment and ABI: [Indexer.json](./deployments/scroll-sepolia/Indexer.json)

#### Ink Sepolia

Version 1.4.1-beta.1:

* **EAS**:
  * Contract: [0x4200000000000000000000000000000000000021](https://explorer-sepolia.inkonchain.com/address/0x4200000000000000000000000000000000000021)
  * Deployment and ABI: [EAS.json](./deployments/ink-sepolia/EAS.json)
* **SchemaRegistry**:
  * Contract: [0x4200000000000000000000000000000000000020](https://explorer-sepolia.inkonchain.com/address/0x4200000000000000000000000000000000000020)
  * Deployment and ABI: [SchemaRegistry.json](./deployments/ink-sepolia/SchemaRegistry.json)
* **EIP712Proxy**:
  * Contract: [0x79369eEe29e7e191F5a6278185eA4a0D906b9b9F](https://explorer-sepolia.inkonchain.com/address/0x79369eEe29e7e191F5a6278185eA4a0D906b9b9F)
  * Deployment and ABI: [EIP712Proxy.json](./deployments/ink-sepolia/EIP712Proxy.json)
* **Indexer**:
  * Contract: [0x367A20665BAB1bb4DB6D80A4CF20db5Be1568d1e](https://explorer-sepolia.inkonchain.com/address/0x367A20665BAB1bb4DB6D80A4CF20db5Be1568d1e)
  * Deployment and ABI: [Indexer.json](./deployments/ink-sepolia/Indexer.json)

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

## License

EAS is open source and distributed under the MIT License (see [`LICENSE`](./LICENSE)).
