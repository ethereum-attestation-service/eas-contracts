/* eslint-disable import/no-extraneous-dependencies */
require('dotenv').config();

/* eslint-disable import/no-extraneous-dependencies */
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bn')(require('bn.js')))
  .use(require('dirty-chai'))
  .expect();

const ganache = require('ganache-core');
const memdown = require('memdown');
/* eslint-enable import/no-extraneous-dependencies */

const HDWalletProvider = require('truffle-hdwallet-provider');
const accounts = require('./test/accounts.json');
const { RINKEBY_MNEMONIC, RINKEBY_INFURA_URL } = process.env;

module.exports = {
  networks: {
    development: {
      network_id: '*',
      provider: ganache.provider({
        db: memdown(),
        accounts: Object.values(accounts.privateKeys).map((privateKey) => {
          return { secretKey: Buffer.from(privateKey, 'hex'), balance: 1000 ** 18 };
        })
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
      version: '0.7.5',
      settings: {
        optimizer: {
          enabled: true,
          runs: 1000
        }
      }
    }
  },
  mocha: {
    before_timeout: 600000,
    timeout: 600000,
    useColors: true,
    slow: 30000
  }
};
