import { DeploymentNetwork } from '../utils/Constants';

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
    ...mainnet('ledger://0x00000000219ab540356cbb839cbe05303d7705fa'),
    ...goerli('ledger://0x00000000219ab540356cbb839cbe05303d7705fa')
  },

  ...TestNamedAccounts
};
