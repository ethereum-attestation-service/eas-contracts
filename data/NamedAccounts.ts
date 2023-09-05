import { DeploymentNetwork } from '../utils/Constants';
import 'dotenv/config';

interface EnvOptions {
  DEPLOYER?: string;
}

const { DEPLOYER: deployer = 'ledger://0x0000000000000000000000000000000000000000' }: EnvOptions =
  process.env as any as EnvOptions;

const mainnet = (address: string) => ({
  [DeploymentNetwork.Mainnet]: address
});

const arbitrumOne = (address: string) => ({
  [DeploymentNetwork.ArbitrumOne]: address
});

const optimism = (address: string) => ({
  [DeploymentNetwork.Optimism]: address
});

const linea = (address: string) => ({
  [DeploymentNetwork.Linea]: address
});

const sepolia = (address: string) => ({
  [DeploymentNetwork.Sepolia]: address
});

const optimismGoerli = (address: string) => ({
  [DeploymentNetwork.OptimismGoerli]: address
});

const baseGoerli = (address: string) => ({
  [DeploymentNetwork.BaseGoerli]: address
});

const arbitrumGoerli = (address: string) => ({
  [DeploymentNetwork.ArbitrumGoerli]: address
});

const lineaGoerli = (address: string) => ({
  [DeploymentNetwork.LineaGoerli]: address
});

export const NamedAccounts = {
  deployer: {
    ...mainnet(deployer),
    ...arbitrumOne(deployer),
    ...optimism(deployer),
    ...linea(deployer),
    ...sepolia(deployer),
    ...optimismGoerli(deployer),
    ...baseGoerli(deployer),
    ...arbitrumGoerli(deployer)
    ...lineaGoerli(deployer)
  }
};
