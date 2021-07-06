import '@nomiclabs/hardhat-ethers';
import '@typechain/hardhat';

import Contracts from '../components/Contracts';

const main = async () => {
  const registry = await Contracts.AORegistry.deploy();
  const verifier = await Contracts.EIP712Verifier.deploy();
  const eas = await Contracts.EAS.deploy(registry.address, verifier.address);

  console.log();

  console.log('Deployed the AORegistry to:', registry.address);
  console.log('Deployed the EIP712Verifier to:', verifier.address);
  console.log('Deployed the EAS to:', eas.address);

  console.log();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);

    process.exit(1);
  });
