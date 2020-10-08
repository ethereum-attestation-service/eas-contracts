const AORegistry = artifacts.require('AORegistry');
const EAS = artifacts.require('EAS');

module.exports = async (deployer) => {
  await deployer.deploy(AORegistry);
  const aoRegistry = await AORegistry.deployed();

  await deployer.deploy(EAS, aoRegistry.address);

  // Register sample AO-1
  await aoRegistry.register('0x0', '0x0000000000000000000000000000000000000000');

  // Register sample AO-2
  await aoRegistry.register('0x0', '0x0000000000000000000000000000000000000000');

  // Register sample AO-3
  await aoRegistry.register('0x0', '0x0000000000000000000000000000000000000000');
};
