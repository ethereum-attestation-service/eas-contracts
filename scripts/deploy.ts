import Contracts from '../components/Contracts';
import '@nomiclabs/hardhat-ethers';
import '@typechain/hardhat';

const main = async () => {
  const registry = await Contracts.ASRegistry.deploy();
  const verifier = await Contracts.EIP712Verifier.deploy();
  const eas = await Contracts.EAS.deploy(registry.address, verifier.address);

  console.log();

  console.log('Deployed the ASRegistry to:', registry.address);
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
