import { deploy, DeployedContracts, InstanceName, setDeploymentMetadata } from '../../utils/Deploy';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const EIP712_PROXY_NAME = 'EIP712Proxy';

const func: DeployFunction = async ({ getNamedAccounts }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();

  const eas = await DeployedContracts.EAS.deployed();

  await deploy({ name: InstanceName.EIP712Proxy, from: deployer, args: [eas.address, EIP712_PROXY_NAME] });

  return true;
};

export default setDeploymentMetadata(__filename, func);
