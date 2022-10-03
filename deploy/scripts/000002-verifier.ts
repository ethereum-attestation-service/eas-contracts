import { deploy, InstanceName, setDeploymentMetadata } from '../../utils/Deploy';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const func: DeployFunction = async ({ getNamedAccounts }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();

  await deploy({ name: InstanceName.EIP712Verifier, from: deployer });

  return true;
};

export default setDeploymentMetadata(__filename, func);
