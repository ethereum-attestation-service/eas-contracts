import { DeploymentNetwork } from '../utils/Constants';
import 'dotenv/config';

interface EnvOptions {
  DEPLOYER?: string;
}

const { DEPLOYER: deployer = 'ledger://0x0000000000000000000000000000000000000000' }: EnvOptions =
  process.env as any as EnvOptions;

export const NamedAccounts = {
  deployer: {
    [DeploymentNetwork.Mainnet]: deployer,
    [DeploymentNetwork.Optimism]: deployer,
    [DeploymentNetwork.Base]: deployer,
    [DeploymentNetwork.ArbitrumOne]: deployer,
    [DeploymentNetwork.ArbitrumNova]: deployer,
    [DeploymentNetwork.Polygon]: deployer,
    [DeploymentNetwork.Scroll]: deployer,
    [DeploymentNetwork.Linea]: deployer,
    [DeploymentNetwork.Sepolia]: deployer,
    [DeploymentNetwork.OptimismSepolia]: deployer,
    [DeploymentNetwork.OptimismGoerli]: deployer,
    [DeploymentNetwork.BaseSepolia]: deployer,
    [DeploymentNetwork.BaseGoerli]: deployer,
    [DeploymentNetwork.ArbitrumGoerli]: deployer,
    [DeploymentNetwork.PolygonMumbai]: deployer,
    [DeploymentNetwork.ScrollSepolia]: deployer,
    [DeploymentNetwork.LineaGoerli]: deployer,
    [DeploymentNetwork.Hardhat]: 0
  }
};
