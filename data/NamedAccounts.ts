import { DeploymentNetwork } from '../utils/Constants';
import 'dotenv/config';

interface EnvOptions {
  DEPLOYER?: string;
}

const { DEPLOYER: deployer = 'ledger://0x0000000000000000000000000000000000000000' }: EnvOptions =
  process.env as any as EnvOptions;

const mainnet = (address: string) => ({
  [DeploymentNetwork.Mainnet]: address,
  [DeploymentNetwork.Tenderly]: address
});

const goerli = (address: string) => ({
  [DeploymentNetwork.Goerli]: address
});

const TestNamedAccounts = {
  ethWhale: {
    ...mainnet('0x00000000219ab540356cbb839cbe05303d7705fa'),
    ...goerli('0xf97e180c050e5Ab072211Ad2C213Eb5AEE4DF134')
  }
};

export const NamedAccounts = {
  deployer: {
    ...mainnet(deployer),
    ...goerli(deployer)
  },

  ...TestNamedAccounts
};
