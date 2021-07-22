import { ethers } from 'hardhat';
import { ContractFactory } from '@ethersproject/contracts';
import { Signer } from '@ethersproject/abstract-signer';

import {
  ASRegistry__factory,
  EIP712Verifier__factory,
  EAS__factory,
  TestASAttestationVerifier__factory,
  TestASAttesterVerifier__factory,
  TestASDataVerifier__factory,
  TestASExpirationTimeVerifier__factory,
  TestASRecipientVerifier__factory,
  TestASValueVerifier__factory,
  TestEAS__factory
} from 'typechain';

type AsyncReturnType<T extends (...args: any) => any> = T extends (...args: any) => Promise<infer U>
  ? U
  : T extends (...args: any) => infer U
  ? U
  : any;

type Contract<F extends ContractFactory> = AsyncReturnType<F['deploy']>;

const deployOrAttach = <F extends ContractFactory>(contractName: string) => {
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
  TestASAttestationVerifier: deployOrAttach<TestASAttestationVerifier__factory>('TestASAttestationVerifier'),
  TestASAttesterVerifier: deployOrAttach<TestASAttesterVerifier__factory>('TestASAttesterVerifier'),
  TestASDataVerifier: deployOrAttach<TestASDataVerifier__factory>('TestASDataVerifier'),
  TestASExpirationTimeVerifier: deployOrAttach<TestASExpirationTimeVerifier__factory>('TestASExpirationTimeVerifier'),
  TestASRecipientVerifier: deployOrAttach<TestASRecipientVerifier__factory>('TestASRecipientVerifier'),
  TestASValueVerifier: deployOrAttach<TestASValueVerifier__factory>('TestASValueVerifier'),
  TestEAS: deployOrAttach<TestEAS__factory>('TestEAS')
});

export default getContracts();
