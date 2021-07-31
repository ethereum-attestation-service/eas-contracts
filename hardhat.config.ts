import * as testAccounts from './test/accounts.json';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import dotenv from 'dotenv';
import 'hardhat-abi-exporter';
import 'hardhat-contract-sizer';
import 'hardhat-docgen';
import 'hardhat-gas-reporter';
import { HardhatUserConfig } from 'hardhat/config';
import 'solidity-coverage';

dotenv.config();

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
      url: loadENVKey<string>('RINKEBY_PROVIDER_URL') || 'http://127.0.0.1:8545',
      accounts: [loadENVKey<string>('RINKEBY_PRIVATE_KEY')]
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
    apiKey: loadENVKey<string>('ETHERSCAN_API_KEY')
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
