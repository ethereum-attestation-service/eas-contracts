const AORegistry = artifacts.require('AORegistry');
const EIP712Verifier = artifacts.require('EIP712Verifier');
const EAS = artifacts.require('EAS');

module.exports = async (deployer) => {
  await deployer.deploy(AORegistry);
  const aoRegistry = await AORegistry.deployed();

  await deployer.deploy(EIP712Verifier);
  const eip712Verifier = await EIP712Verifier.deployed();

  await deployer.deploy(EAS, aoRegistry.address, eip712Verifier.address);

  // Register sample AO-1
  await aoRegistry.register('0x0', '0x0000000000000000000000000000000000000000');

  // Register sample AO-2
  await aoRegistry.register('0x0', '0x0000000000000000000000000000000000000000');

  // Register sample AO-3
  await aoRegistry.register('0x0', '0x0000000000000000000000000000000000000000');
};
