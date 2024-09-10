import { NamedAccounts } from './data/NamedAccounts';
import { DeploymentNetwork } from './utils/Constants';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import 'zksync-ethers';
import '@matterlabs/hardhat-zksync-solc';
import '@matterlabs/hardhat-zksync-deploy';
import '@matterlabs/hardhat-zksync-verify';
import '@nomiclabs/hardhat-solhint';
import 'dotenv/config';
import 'hardhat-contract-sizer';
import { HardhatUserConfig } from 'hardhat/config';
import { MochaOptions } from 'mocha';

interface EnvOptions {
  ETHEREUM_PROVIDER_URL?: string;
  ETHEREUM_ETHERSCAN_API_KEY?: string;
  OPTIMISM_PROVIDER_URL?: string;
  OPTIMISM_ETHERSCAN_API_KEY?: string;
  BASE_PROVIDER_URL?: string;
  BASE_ETHERSCAN_API_KEY?: string;
  ARBITRUM_ONE_PROVIDER_URL?: string;
  ARBITRUM_ONE_ETHERSCAN_API_KEY?: string;
  ARBITRUM_NOVA_PROVIDER_URL?: string;
  ARBITRUM_NOVA_ETHERSCAN_API_KEY?: string;
  POLYGON_PROVIDER_URL?: string;
  POLYGON_ETHERSCAN_API_KEY?: string;
  SCROLL_PROVIDER_URL?: string;
  SCROLL_ETHERSCAN_API_KEY?: string;
  ZKSYNC_PROVIDER_URL?: string;
  CELO_PROVIDER_URL?: string;
  CELO_ETHERSCAN_API_KEY?: string;
  LINEA_PROVIDER_URL?: string;
  LINEA_ETHERSCAN_API_KEY?: string;
  ETHEREUM_SEPOLIA_PROVIDER_URL?: string;
  OPTIMISM_GOERLI_PROVIDER_URL?: string;
  OPTIMISM_SEPOLIA_PROVIDER_URL?: string;
  BASE_SEPOLIA_PROVIDER_URL?: string;
  BASE_GOERLI_PROVIDER_URL?: string;
  ARBITRUM_GOERLI_PROVIDER_URL?: string;
  POLYGON_AMOY_PROVIDER_URL?: string;
  SCROLL_SEPOLIA_PROVIDER_URL?: string;
  LINEA_GOERLI_PROVIDER_URL?: string;
  AVALANCHE_ETHERSCAN_API_KEY?: string;
  AVALANCHE_FUJI_PROVIDER_URL?: string;
  ASTAR_ZKYOTO_PROVIDER_URL?: string;
  ASTAR_ETHERSCAN_API_KEY?: string;
  MINATO_PROVIDER_URL?: string;
  MINATO_ETHERSCAN_API_KEY?: string
  PROFILE?: boolean;
}

const {
  ETHEREUM_PROVIDER_URL = '',
  ETHEREUM_ETHERSCAN_API_KEY = '',
  OPTIMISM_PROVIDER_URL = '',
  OPTIMISM_ETHERSCAN_API_KEY = '',
  BASE_PROVIDER_URL = '',
  BASE_ETHERSCAN_API_KEY = '',
  ARBITRUM_ONE_PROVIDER_URL = '',
  ARBITRUM_ONE_ETHERSCAN_API_KEY = '',
  ARBITRUM_NOVA_PROVIDER_URL = '',
  ARBITRUM_NOVA_ETHERSCAN_API_KEY = '',
  POLYGON_PROVIDER_URL = '',
  SCROLL_PROVIDER_URL = '',
  SCROLL_ETHERSCAN_API_KEY = '',
  ZKSYNC_PROVIDER_URL = '',
  CELO_PROVIDER_URL = '',
  CELO_ETHERSCAN_API_KEY = '',
  LINEA_PROVIDER_URL = '',
  LINEA_ETHERSCAN_API_KEY = '',
  ETHEREUM_SEPOLIA_PROVIDER_URL = '',
  OPTIMISM_SEPOLIA_PROVIDER_URL = '',
  OPTIMISM_GOERLI_PROVIDER_URL = '',
  BASE_SEPOLIA_PROVIDER_URL = '',
  BASE_GOERLI_PROVIDER_URL = '',
  ARBITRUM_GOERLI_PROVIDER_URL = '',
  POLYGON_AMOY_PROVIDER_URL = '',
  POLYGON_ETHERSCAN_API_KEY = '',
  SCROLL_SEPOLIA_PROVIDER_URL = '',
  LINEA_GOERLI_PROVIDER_URL = '',
  AVALANCHE_ETHERSCAN_API_KEY = '',
  AVALANCHE_FUJI_PROVIDER_URL = '',
  ASTAR_ZKYOTO_PROVIDER_URL = '',
  ASTAR_ETHERSCAN_API_KEY = '',
  MINATO_PROVIDER_URL = '',
  MINATO_ETHERSCAN_API_KEY = '',
  PROFILE: isProfiling
}: EnvOptions = process.env as any as EnvOptions;

const mochaOptions = (): MochaOptions => {
  let timeout = 600000;
  let grep;
  let reporter;

  if (isProfiling) {
    timeout = 0;
    reporter = 'mocha-silent-reporter';
  }

  return {
    timeout,
    color: true,
    bail: true,
    grep,
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
      saveDeployments: true,
      live: false
    },
    [DeploymentNetwork.Mainnet]: {
      chainId: 1,
      url: ETHEREUM_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: ETHEREUM_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.Optimism]: {
      chainId: 10,
      url: OPTIMISM_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: OPTIMISM_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.Base]: {
      chainId: 8453,
      url: BASE_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: BASE_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.ArbitrumOne]: {
      chainId: 42161,
      url: ARBITRUM_ONE_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: ARBITRUM_ONE_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.ArbitrumNova]: {
      chainId: 42170,
      url: ARBITRUM_NOVA_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: ARBITRUM_NOVA_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.Polygon]: {
      chainId: 137,
      url: POLYGON_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: POLYGON_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.Scroll]: {
      chainId: 534352,
      url: SCROLL_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: SCROLL_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.ZKSync]: {
      chainId: 324,
      url: ZKSYNC_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      zksync: true,
      ethNetwork: DeploymentNetwork.Mainnet,
      verifyURL: 'https://zksync2-mainnet-explorer.zksync.io/contract_verification'
    },
    [DeploymentNetwork.Celo]: {
      chainId: 42220,
      url: CELO_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: CELO_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.Linea]: {
      chainId: 59144,
      url: LINEA_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: LINEA_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.Sepolia]: {
      chainId: 11155111,
      url: ETHEREUM_SEPOLIA_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: ETHEREUM_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.OptimismSepolia]: {
      chainId: 11155420,
      url: OPTIMISM_SEPOLIA_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: OPTIMISM_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.OptimismGoerli]: {
      chainId: 420,
      url: OPTIMISM_GOERLI_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: OPTIMISM_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.BaseSepolia]: {
      chainId: 84532,
      url: BASE_SEPOLIA_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: BASE_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.BaseGoerli]: {
      chainId: 84531,
      url: BASE_GOERLI_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: BASE_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.ArbitrumGoerli]: {
      chainId: 421613,
      url: ARBITRUM_GOERLI_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: ARBITRUM_ONE_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.PolygonAmoy]: {
      chainId: 80002,
      url: POLYGON_AMOY_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: POLYGON_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.ScrollSepolia]: {
      chainId: 534351,
      url: SCROLL_SEPOLIA_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: SCROLL_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.LineaGoerli]: {
      chainId: 59140,
      url: LINEA_GOERLI_PROVIDER_URL,
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: LINEA_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.AvalancheFuji]: {
      chainId: 43113,
      url: AVALANCHE_FUJI_PROVIDER_URL,
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: AVALANCHE_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.AstarzKyoto]: {
      chainId: 1998,
      url: ASTAR_ZKYOTO_PROVIDER_URL,
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { apiKey: ASTAR_ETHERSCAN_API_KEY }
      }
    },
    [DeploymentNetwork.Minato]: {
      chainId: 1946,
      url: MINATO_PROVIDER_URL,
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      saveDeployments: true,
      live: true,
      verify: {
        etherscan: { 
          apiKey: MINATO_ETHERSCAN_API_KEY 
        },
      },
      verifyURL: 'https://explorer-testnet.soneium.org/api'
    },
  },

  paths: {
    deploy: ['deploy/scripts']
  },

  solidity: {
    version: '0.8.26',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000
      },
      evmVersion: 'paris', // Prevent using the `PUSH0` opcode
      metadata: {
        bytecodeHash: 'none' // Remove the metadata hash from the bytecode
      }
    }
  },

  typechain: {
    target: 'ethers-v6'
  },

  namedAccounts: NamedAccounts,

  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false
  },

  gasReporter: {
    currency: 'USD',
    enabled: isProfiling
  },

  zksolc: {
    version: '1.4.1',
    settings: {
      optimizer: {
        enabled: true,
        mode: '3'
      }
    }
  },

  mocha: mochaOptions()
};

export default config;
