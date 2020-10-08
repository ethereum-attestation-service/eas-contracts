/* eslint-disable import/no-extraneous-dependencies */
require('dotenv').config();

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

const HDWalletProvider = require('truffle-hdwallet-provider');

const { RINKEBY_MNEMONIC, RINKEBY_INFURA_URL } = process.env;

module.exports = {
  networks: {
    development: {
      network_id: '*',
      provider: ganache.provider({
        total_accounts: 100,
        default_balance_ether: 1000
      })
    },
    ganache: {
      network_id: '*',
      host: '127.0.0.1',
      port: 7545
    },
    rinkeby: {
      provider: () => new HDWalletProvider(RINKEBY_MNEMONIC, RINKEBY_INFURA_URL),
      network_id: 4
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
