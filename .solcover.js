const accounts = require('./test/accounts.json');
const memdown = require('memdown');

module.exports = {
  testCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle run coverage',
  compileCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle compile',
  copyPackages: ['@openzeppelin/contracts'],
  norpc: true,
  skipFiles: ['Migrations.sol', 'tests'],
  providerOptions: {
    db: memdown(),
    accounts: Object.values(accounts.privateKeys).map((privateKey) => {
      return { secretKey: Buffer.from(privateKey, 'hex'), balance: 1000 ** 18 };
    })
  }
};
