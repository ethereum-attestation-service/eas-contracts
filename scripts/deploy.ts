import Contracts from '../components/Contracts';
import '@nomiclabs/hardhat-ethers';
import '@typechain/hardhat';
import retry from 'async-retry';
import { Contract } from 'ethers';
import { network, run } from 'hardhat';

const TEST_NETWORKS = ['hardhat', 'localhost'];

const verify = async (contract: Contract, ctorArgs: any[] = []) =>
  retry(
    async () => {
      try {
        await run('verify:verify', {
          address: contract.address,
          constructorArguments: ctorArgs
        });

        console.log();
      } catch (e) {
        console.error(e);
        console.log();

        console.log('Retrying...');

        throw e;
      }
    },
    {
      minTimeout: 60000,
      retries: 5
    }
  );

const main = async () => {
  console.log();

  console.log('Deploying contracts...');

  const registry = await Contracts.ASRegistry.deploy();
  console.log(`Deployed ASRegistry v${await registry.VERSION()} to ${registry.address}`);

  const verifier = await Contracts.EIP712Verifier.deploy();
  console.log(`Deployed EIP712Verifier v${await verifier.VERSION()} to ${verifier.address}`);

  const eas = await Contracts.EAS.deploy(registry.address, verifier.address);
  console.log(`Deployed EAS v${await eas.VERSION()} to ${eas.address}`);

  console.log();

  if (TEST_NETWORKS.includes(network.name)) {
    return;
  }

  console.log('Verifying contracts...');

  console.log('Verifying ASRegistry...');
  await verify(registry);

  console.log('Verifying EIP712Verifier...');
  await verify(verifier);

  console.log('Verifying EAS...');
  await verify(eas, [registry.address, verifier.address]);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);

    process.exit(1);
  });
