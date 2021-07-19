import { ethers } from 'hardhat';
import { ContractFactory } from '@ethersproject/contracts';
import { Signer } from '@ethersproject/abstract-signer';

import {
  AORegistry__factory,
  EIP712Verifier__factory,
  EAS__factory,
  TestAOAttestationVerifier__factory,
  TestAOAttesterVerifier__factory,
  TestAODataVerifier__factory,
  TestAOExpirationTimeVerifier__factory,
  TestAORecipientVerifier__factory,
  TestAOValueVerifier__factory,
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
  AORegistry: deployOrAttach<AORegistry__factory>('AORegistry'),
  EIP712Verifier: deployOrAttach<EIP712Verifier__factory>('EIP712Verifier'),
  EAS: deployOrAttach<EAS__factory>('EAS'),
  TestAOAttestationVerifier: deployOrAttach<TestAOAttestationVerifier__factory>('TestAOAttestationVerifier'),
  TestAOAttesterVerifier: deployOrAttach<TestAOAttesterVerifier__factory>('TestAOAttesterVerifier'),
  TestAODataVerifier: deployOrAttach<TestAODataVerifier__factory>('TestAODataVerifier'),
  TestAOExpirationTimeVerifier: deployOrAttach<TestAOExpirationTimeVerifier__factory>('TestAOExpirationTimeVerifier'),
  TestAORecipientVerifier: deployOrAttach<TestAORecipientVerifier__factory>('TestAORecipientVerifier'),
  TestAOValueVerifier: deployOrAttach<TestAOValueVerifier__factory>('TestAOValueVerifier'),
  TestEAS: deployOrAttach<TestEAS__factory>('TestEAS')
});

export default getContracts();
