const accounts = require('./test/accounts.json');

module.exports = {
  testCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle run coverage',
  compileCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle compile',
  copyPackages: ['@openzeppelin/contracts'],
  norpc: true,
  skipFiles: ['Migrations.sol', 'tests'],
  providerOptions: {
    accounts: Object.values(accounts.privateKeys).map((privateKey) => {
      return { secretKey: Buffer.from(privateKey, 'hex'), balance: 1000 ** 18 };
    })
  }
};
