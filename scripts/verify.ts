import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import hre from 'hardhat';
import { EIP712_PROXY_NAME } from '../deploy/scripts/000005-eip712-proxy';
import { DeployedContracts, InstanceName } from '../utils/Deploy';
import Logger from '../utils/Logger';

const main = async () => {
  const schemaRegistry = await DeployedContracts.SchemaRegistry.deployed();
  const eas = await DeployedContracts.EAS.deployed();
  const eip712Proxy = await DeployedContracts.EIP712Proxy.deployed();
  const indexer = await DeployedContracts.Indexer.deployed();

  for (const contractInfo of [
    {
      name: InstanceName.SchemaRegistry,
      address: await schemaRegistry.getAddress(),
      contract: `contracts/SchemaRegistry.sol:${InstanceName.SchemaRegistry}`,
      constructorArguments: []
    },
    {
      name: InstanceName.EAS,
      address: await eas.getAddress(),
      contract: `contracts/EAS.sol:${InstanceName.EAS}`,
      constructorArguments: [await schemaRegistry.getAddress()]
    },
    {
      name: InstanceName.EIP712Proxy,
      address: await eip712Proxy.getAddress(),
      contract: `contracts/eip712/proxy/EIP712Proxy.sol:${InstanceName.EIP712Proxy}`,
      constructorArguments: [await eas.getAddress(), EIP712_PROXY_NAME]
    },
    {
      name: InstanceName.Indexer,
      address: await indexer.getAddress(),
      contract: `contracts/Indexer.sol:${InstanceName.Indexer}`,
      constructorArguments: [await eas.getAddress()]
    }
  ]) {
    Logger.info(`Verifying ${contractInfo.name}`);

    console.log('contractInfo', contractInfo);

    await hre.run('verify:verify', contractInfo);
  }
};

main();
