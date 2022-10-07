import {
  EAS__factory,
  EIP712Verifier__factory,
  SchemaRegistry__factory,
  TestAttestationResolver__factory,
  TestAttesterResolver__factory,
  TestDataResolver__factory,
  TestEAS__factory,
  TestERC20Token__factory,
  TestExpirationTimeResolver__factory,
  TestPayingResolver__factory,
  TestRecipientResolver__factory,
  TestSchemaResolver__factory,
  TestTokenResolver__factory,
  TestValueResolver__factory
} from '../typechain-types';
import { ContractFactory, Signer } from 'ethers';
import { ethers } from 'hardhat';

export * from '../typechain-types';

type AsyncReturnType<T extends (...args: any) => any> = T extends (...args: any) => Promise<infer U>
  ? U
  : T extends (...args: any) => infer U
  ? U
  : any;

type Contract<F extends ContractFactory> = AsyncReturnType<F['deploy']>;

export interface ContractBuilder<F extends ContractFactory> {
  deploy(...args: Parameters<F['deploy']>): Promise<Contract<F>>;
  attach(address: string, passedSigner?: Signer): Promise<Contract<F>>;
}

const deployOrAttach = <F extends ContractFactory>(contractName: string): ContractBuilder<F> => {
  return {
    deploy: async (...args: Parameters<F['deploy']>): Promise<Contract<F>> => {
      const defaultSigner = (await ethers.getSigners())[0];
      return (await ethers.getContractFactory(contractName, defaultSigner)).deploy(...args) as Contract<F>;
    },
    attach: attachOnly<F>(contractName).attach
  };
};

const attachOnly = <F extends ContractFactory>(contractName: string) => {
  return {
    attach: async (address: string, signer?: Signer): Promise<Contract<F>> => {
      const defaultSigner = (await ethers.getSigners())[0];
      return ethers.getContractAt(contractName, address, signer ?? defaultSigner) as Contract<F>;
    }
  };
};

/* eslint-disable camelcase */
const getContracts = () => ({
  EAS: deployOrAttach<EAS__factory>('EAS'),
  EIP712Verifier: deployOrAttach<EIP712Verifier__factory>('EIP712Verifier'),
  SchemaRegistry: deployOrAttach<SchemaRegistry__factory>('SchemaRegistry'),
  TestAttestationResolver: deployOrAttach<TestAttestationResolver__factory>('TestAttestationResolver'),
  TestAttesterResolver: deployOrAttach<TestAttesterResolver__factory>('TestAttesterResolver'),
  TestDataResolver: deployOrAttach<TestDataResolver__factory>('TestDataResolver'),
  TestEAS: deployOrAttach<TestEAS__factory>('TestEAS'),
  TestERC20Token: deployOrAttach<TestERC20Token__factory>('TestERC20Token'),
  TestExpirationTimeResolver: deployOrAttach<TestExpirationTimeResolver__factory>('TestExpirationTimeResolver'),
  TestPayingResolver: deployOrAttach<TestPayingResolver__factory>('TestPayingResolver'),
  TestRecipientResolver: deployOrAttach<TestRecipientResolver__factory>('TestRecipientResolver'),
  TestSchemaResolver: deployOrAttach<TestSchemaResolver__factory>('TestSchemaResolver'),
  TestTokenResolver: deployOrAttach<TestTokenResolver__factory>('TestTokenResolver'),
  TestValueResolver: deployOrAttach<TestValueResolver__factory>('TestValueResolver')
});
/* eslint-enable camelcase */

export default getContracts();
