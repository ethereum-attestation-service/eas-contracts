import {
  AttestationResolver__factory,
  AttesterResolver__factory,
  DataResolver__factory,
  EAS__factory,
  EIP712Verifier__factory,
  ExpirationTimeResolver__factory,
  PayingResolver__factory,
  RecipientResolver__factory,
  RevocationResolver__factory,
  SchemaRegistry__factory,
  TestEAS__factory,
  TestERC20Token__factory,
  TestSchemaResolver__factory,
  TokenResolver__factory,
  ValueResolver__factory
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
  AttestationResolver: deployOrAttach<AttestationResolver__factory>('AttestationResolver'),
  AttesterResolver: deployOrAttach<AttesterResolver__factory>('AttesterResolver'),
  DataResolver: deployOrAttach<DataResolver__factory>('DataResolver'),
  EAS: deployOrAttach<EAS__factory>('EAS'),
  EIP712Verifier: deployOrAttach<EIP712Verifier__factory>('EIP712Verifier'),
  ExpirationTimeResolver: deployOrAttach<ExpirationTimeResolver__factory>('ExpirationTimeResolver'),
  PayingResolver: deployOrAttach<PayingResolver__factory>('PayingResolver'),
  RecipientResolver: deployOrAttach<RecipientResolver__factory>('RecipientResolver'),
  RevocationResolver: deployOrAttach<RevocationResolver__factory>('RevocationResolver'),
  SchemaRegistry: deployOrAttach<SchemaRegistry__factory>('SchemaRegistry'),
  TestEAS: deployOrAttach<TestEAS__factory>('TestEAS'),
  TestERC20Token: deployOrAttach<TestERC20Token__factory>('TestERC20Token'),
  TestSchemaResolver: deployOrAttach<TestSchemaResolver__factory>('TestSchemaResolver'),
  TokenResolver: deployOrAttach<TokenResolver__factory>('TokenResolver'),
  ValueResolver: deployOrAttach<ValueResolver__factory>('ValueResolver')
});
/* eslint-enable camelcase */

export default getContracts();
