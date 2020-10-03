/* eslint-disable import/no-extraneous-dependencies */
require('babel-register');
require('babel-polyfill');

/* eslint-disable import/no-extraneous-dependencies */
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bn')(require('bn.js')))
  .use(require('dirty-chai'))
  .expect();

const ganache = require('ganache-core');
/* eslint-enable import/no-extraneous-dependencies */

module.exports = {
  networks: {
    development: {
      network_id: '*',
      provider: ganache.provider({
        total_accounts: 100,
        default_balance_ether: 1000
      })
    }
  },
  plugins: ['solidity-coverage'],
  compilers: {
    solc: {
      version: '0.6.12',
      settings: {
        optimizer: {
          enabled: true,
          runs: 1000
        }
      }
    }
  },
  mocha: {
    useColors: true,
    slow: 30000
  }
};
