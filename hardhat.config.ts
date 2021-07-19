import { HardhatUserConfig } from 'hardhat/config';

import 'tsconfig-paths/register';

import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@typechain/hardhat';

import 'solidity-coverage';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-contract-sizer';
import 'hardhat-abi-exporter';
import 'hardhat-gas-reporter';
import 'hardhat-docgen';

import * as testAccounts from 'test/accounts.json';

const loadENVKey = <T>(envKeyName: string) => {
  return process.env[envKeyName] as unknown as T;
};

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      gasPrice: 20000000000,
      gas: 9500000,
      accounts: Object.values(<any>testAccounts.privateKeys).map((privateKey: any) => ({
        privateKey,
        balance: '10000000000000000000000000000'
      }))
    },

    rinkeby: {
      url: loadENVKey('RINKEBY_INFURA_URL') || 'http://127.0.0.1:8545',
      accounts: {
        mnemonic: loadENVKey('RINKEBY_MNEMONIC') || ''
      }
    }
  },

  solidity: {
    version: '0.7.6',
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000
      },
      metadata: {
        bytecodeHash: 'none'
      }
    }
  },

  etherscan: {
    apiKey: loadENVKey('ETHERSCAN_API')
  },

  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false
  },

  abiExporter: {
    path: './data/abi',
    clear: true
  },

  gasReporter: {
    currency: 'USD',
    enabled: loadENVKey('PROFILE')
  },

  mocha: {
    timeout: 600000,
    color: true,
    bail: true
  }
};

export default config;
