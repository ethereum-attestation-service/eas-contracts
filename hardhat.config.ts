import { NamedAccounts } from './data/NamedAccounts';
import { DeploymentNetwork } from './utils/Constants';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-solhint';
import '@nomiclabs/hardhat-waffle';
import * as tdly from '@tenderly/hardhat-tenderly';
import '@typechain/hardhat';
import 'dotenv/config';
import 'hardhat-contract-sizer';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import { HardhatUserConfig } from 'hardhat/config';
import { MochaOptions } from 'mocha';
import 'solidity-coverage';

tdly.setup();

interface EnvOptions {
  ETHEREUM_PROVIDER_URL?: string;
  ETHEREUM_GOERLI_PROVIDER_URL?: string;
  ETHERSCAN_API_KEY?: string;
  GAS_PRICE?: number | 'auto';
  PROFILE?: boolean;
  TENDERLY_FORK_ID?: string;
  TENDERLY_PROJECT?: string;
  TENDERLY_TEST_PROJECT?: string;
  TENDERLY_USERNAME?: string;
}

const {
  ETHEREUM_PROVIDER_URL = '',
  ETHEREUM_GOERLI_PROVIDER_URL = '',
  ETHERSCAN_API_KEY,
  GAS_PRICE: gasPrice,
  PROFILE: isProfiling,
  TENDERLY_FORK_ID = '',
  TENDERLY_PROJECT = '',
  TENDERLY_TEST_PROJECT = '',
  TENDERLY_USERNAME = ''
}: EnvOptions = process.env as any as EnvOptions;

const mochaOptions = (): MochaOptions => {
  let timeout = 600000;
  let grep;
  let reporter;
  let invert = false;

  if (isProfiling) {
    // if we're profiling, make sure to only run @profile tests without any timeout restriction, and silence most
    // of test output
    timeout = 0;
    grep = '@profile';
    reporter = 'mocha-silent-reporter';
  } else {
    // if we're running in dev, filter out profile tests
    grep = '@profile';
    invert = true;
  }

  return {
    timeout,
    color: true,
    bail: true,
    grep,
    invert,
    reporter
  };
};

const config: HardhatUserConfig = {
  networks: {
    [DeploymentNetwork.Hardhat]: {
      accounts: {
        count: 20,
        accountsBalance: '10000000000000000000000000000000000000000000000'
      },
      allowUnlimitedContractSize: true,
      saveDeployments: false,
      live: false
    },
    [DeploymentNetwork.Mainnet]: {
      chainId: 1,
      url: ETHEREUM_PROVIDER_URL,
      gasPrice: gasPrice || 'auto',
      saveDeployments: true,
      live: true
    },

    [DeploymentNetwork.Goerli]: {
      chainId: 5,
      url: ETHEREUM_GOERLI_PROVIDER_URL,
      saveDeployments: true,
      live: true
    },

    [DeploymentNetwork.Tenderly]: {
      chainId: 1,
      url: `https://rpc.tenderly.co/fork/${TENDERLY_FORK_ID}`,
      autoImpersonate: true,
      saveDeployments: true,
      live: true
    }
  },

  paths: {
    deploy: ['deploy/scripts']
  },

  tenderly: {
    forkNetwork: '1',
    project: TENDERLY_PROJECT || TENDERLY_TEST_PROJECT,
    username: TENDERLY_USERNAME
  },

  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 100000,
        details: {
          yul: true
        }
      },
      metadata: {
        bytecodeHash: 'none'
      }
    }
  },

  namedAccounts: NamedAccounts,

  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },

  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false
  },

  gasReporter: {
    currency: 'USD',
    enabled: isProfiling
  },

  mocha: mochaOptions()
};

export default config;
