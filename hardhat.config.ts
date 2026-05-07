import '@nomicfoundation/hardhat-toolbox';
import '@nomiclabs/hardhat-solhint';
import 'hardhat-contract-sizer';
import { HardhatUserConfig } from 'hardhat/config';
import { MochaOptions } from 'mocha';

type BytecodeHash = 'none' | 'ipfs' | 'bzzr1';

interface EnvOptions {
  PROFILE?: boolean;
  DEPLOYER_PRIVATE_KEY?: string;
  PULSECHAIN_RPC_URL?: string;
  PULSECHAIN_TESTNET_RPC_URL?: string;
  PULSESCAN_API_KEY?: string;
  PULSESCAN_TESTNET_API_KEY?: string;
  BYTECODE_HASH?: string;
}

const {
  PROFILE: isProfiling,
  DEPLOYER_PRIVATE_KEY,
  PULSECHAIN_RPC_URL = 'https://rpc.pulsechain.com',
  PULSECHAIN_TESTNET_RPC_URL = 'https://rpc.v4.testnet.pulsechain.com',
  PULSESCAN_API_KEY = '',
  PULSESCAN_TESTNET_API_KEY = '',
  BYTECODE_HASH
}: EnvOptions = process.env as any as EnvOptions;

const deployerAccounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

// Compiler metadata-hash mode. Default is 'none' to preserve cross-chain
// deterministic bytecode (matches upstream EAS convention — every chain in
// `deployments/` was compiled this way, so addresses derived from CREATE2 +
// salt are identical across chains). Set BYTECODE_HASH=ipfs when the goal is
// a full match on Sourcify (the metadata trailer is what Sourcify hashes for
// full-match status). 'bzzr1' is the legacy Swarm variant; rarely needed.
const validBytecodeHashes: BytecodeHash[] = ['none', 'ipfs', 'bzzr1'];
const bytecodeHash: BytecodeHash = (() => {
  if (!BYTECODE_HASH) return 'none';
  if (!validBytecodeHashes.includes(BYTECODE_HASH as BytecodeHash)) {
    throw new Error(
      `Invalid BYTECODE_HASH=${BYTECODE_HASH}. Must be one of: ${validBytecodeHashes.join(', ')}`
    );
  }
  return BYTECODE_HASH as BytecodeHash;
})();

const mochaOptions = (): MochaOptions => {
  let timeout = 600000;
  let reporter;

  if (isProfiling) {
    timeout = 0;
    reporter = 'mocha-silent-reporter';
  }

  return {
    timeout,
    color: true,
    bail: true,
    reporter
  };
};

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      accounts: {
        count: 20,
        accountsBalance: '10000000000000000000000000000000000000000000000'
      },
      allowUnlimitedContractSize: true
    },
    pulsechain: {
      url: PULSECHAIN_RPC_URL,
      chainId: 369,
      accounts: deployerAccounts
    },
    'pulsechain-testnet': {
      url: PULSECHAIN_TESTNET_RPC_URL,
      chainId: 943,
      accounts: deployerAccounts
    }
  },

  etherscan: {
    apiKey: {
      pulsechain: PULSESCAN_API_KEY,
      'pulsechain-testnet': PULSESCAN_TESTNET_API_KEY
    },
    customChains: [
      {
        network: 'pulsechain',
        chainId: 369,
        urls: {
          apiURL: 'https://api.scan.pulsechain.com/api',
          browserURL: 'https://scan.pulsechain.com'
        }
      },
      {
        network: 'pulsechain-testnet',
        chainId: 943,
        urls: {
          apiURL: 'https://api.scan.v4.testnet.pulsechain.com/api',
          browserURL: 'https://scan.v4.testnet.pulsechain.com'
        }
      }
    ]
  },

  // Decentralized verification via Sourcify, attempted on every `hardhat verify`
  // call alongside the Etherscan/Blockscout submission. Sourcify auto-detects
  // chains by chainId; it may or may not have PulseChain testnet (943) on its
  // supported list — in that case the submission is skipped, not failed.
  sourcify: {
    enabled: true
  },

  solidity: {
    version: '0.8.29',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000
      },
      evmVersion: 'paris', // Prevent using the `PUSH0` opcode
      metadata: {
        bytecodeHash // env-controlled via BYTECODE_HASH; default 'none'
      }
    }
  },

  typechain: {
    target: 'ethers-v6'
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
