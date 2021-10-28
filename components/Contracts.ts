import {
  ASRegistry__factory,
  EAS__factory,
  EIP712Verifier__factory,
  TestASAttestationResolver__factory,
  TestASAttesterResolver__factory,
  TestASDataResolver__factory,
  TestASExpirationTimeResolver__factory,
  TestASPayingResolver__factory,
  TestASRecipientResolver__factory,
  TestASTokenResolver__factory,
  TestASValueResolver__factory,
  TestEAS__factory,
  TestERC20Token__factory
} from '../typechain';
import { Signer } from '@ethersproject/abstract-signer';
import { ContractFactory } from '@ethersproject/contracts';
import { ethers } from 'hardhat';

type AsyncReturnType<T extends (...args: any) => any> = T extends (...args: any) => Promise<infer U>
  ? U
  : T extends (...args: any) => infer U
  ? U
  : any;

type Contract<F extends ContractFactory> = AsyncReturnType<F['deploy']>;


export interface ContractBuilder<F extends ContractFactory> {
  contractName: string;
  deploy(...args: Parameters<F['deploy']>): Promise<Contract<F>>;
  attach(address: string, passedSigner?: Signer): Promise<Contract<F>>;


const deployOrAttach = <F extends ContractFactory>(contractName: string): ContractBuilder<F> => {
  return {
    deploy: async (...args: Parameters<F['deploy']>): Promise<Contract<F>> => {
      let defaultSigner = (await ethers.getSigners())[0];
      return (await ethers.getContractFactory(contractName, defaultSigner)).deploy(...args) as Contract<F>;
    },
    attach: attachOnly<F>(contractName).attach
  };
};

const attachOnly = <F extends ContractFactory>(contractName: string) => {
  return {
    attach: async (address: string, signer?: Signer): Promise<Contract<F>> => {
      let defaultSigner = (await ethers.getSigners())[0];
      return ethers.getContractAt(contractName, address, signer ? signer : defaultSigner) as Contract<F>;
    }
  };
};

const getContracts = () => ({
  ASRegistry: deployOrAttach<ASRegistry__factory>('ASRegistry'),
  EIP712Verifier: deployOrAttach<EIP712Verifier__factory>('EIP712Verifier'),
  EAS: deployOrAttach<EAS__factory>('EAS'),
  TestASAttestationResolver: deployOrAttach<TestASAttestationResolver__factory>('TestASAttestationResolver'),
  TestASAttesterResolver: deployOrAttach<TestASAttesterResolver__factory>('TestASAttesterResolver'),
  TestASDataResolver: deployOrAttach<TestASDataResolver__factory>('TestASDataResolver'),
  TestASExpirationTimeResolver: deployOrAttach<TestASExpirationTimeResolver__factory>('TestASExpirationTimeResolver'),
  TestASPayingResolver: deployOrAttach<TestASPayingResolver__factory>('TestASPayingResolver'),
  TestASRecipientResolver: deployOrAttach<TestASRecipientResolver__factory>('TestASRecipientResolver'),
  TestASTokenResolver: deployOrAttach<TestASTokenResolver__factory>('TestASTokenResolver'),
  TestASValueResolver: deployOrAttach<TestASValueResolver__factory>('TestASValueResolver'),
  TestEAS: deployOrAttach<TestEAS__factory>('TestEAS'),
  TestERC20Token: deployOrAttach<TestERC20Token__factory>('TestERC20Token')
});

export default getContracts();
