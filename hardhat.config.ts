import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import dotenv from 'dotenv';
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
      accounts: {
        count: 10,
        accountsBalance: '10000000000000000000000000000'
      }
    },

    rinkeby: {
      url: loadENVKey<string>('RINKEBY_PROVIDER_URL') || 'http://127.0.0.1:8545',
      accounts: [
        loadENVKey<string>('RINKEBY_PRIVATE_KEY') ||
          '0x0000000000000000000000000000000000000000000000000000000000000000'
      ]
    }
  },

  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000
      },
      viaIR: true,
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
