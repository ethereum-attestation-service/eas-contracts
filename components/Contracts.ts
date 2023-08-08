import { ContractFactory, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { ABI } from 'hardhat-deploy/types';
import {
  AttestationResolver__factory,
  AttesterResolver__factory,
  DataResolver__factory,
  EAS__factory,
  ExpirationTimeResolver__factory,
  PayingResolver__factory,
  PermissionedEIP712Proxy__factory,
  RecipientResolver__factory,
  RevocationResolver__factory,
  SchemaRegistry__factory,
  TestEAS__factory,
  TestEIP712Proxy__factory,
  TestEIP1271Signer__factory,
  TestEIP1271Verifier__factory,
  TestERC20Token__factory,
  TestSchemaResolver__factory,
  TokenResolver__factory,
  ValueResolver__factory
} from '../typechain-types';

export * from '../typechain-types';

type AsyncReturnType<T extends (...args: any) => any> = T extends (...args: any) => Promise<infer U>
  ? U
  : T extends (...args: any) => infer U
  ? U
  : any;

type Contract<F extends ContractFactory> = AsyncReturnType<F['deploy']>;

export interface ContractBuilder<F extends ContractFactory> {
  metadata: {
    contractName: string;
    abi: ABI;
    bytecode: string;
  };
  deploy(...args: Parameters<F['deploy']>): Promise<Contract<F>>;
  attach(address: string, passedSigner?: Signer): Promise<Contract<F>>;
}

export type FactoryConstructor<F extends ContractFactory> = {
  new (signer?: Signer): F;
  abi: unknown;
  bytecode: string;
};

export const deployOrAttach = <F extends ContractFactory>(
  contractName: string,
  FactoryConstructor: FactoryConstructor<F>,
  initialSigner?: Signer
): ContractBuilder<F> => {
  return {
    metadata: {
      contractName,
      abi: FactoryConstructor.abi as ABI,
      bytecode: FactoryConstructor.bytecode
    },
    deploy: async (...args: Parameters<F['deploy']>): Promise<Contract<F>> => {
      const defaultSigner = initialSigner ?? ((await ethers.getSigners())[0] as any as Signer);

      return new FactoryConstructor(defaultSigner).deploy(...(args || [])) as Promise<Contract<F>>;
    },
    attach: attachOnly<F>(FactoryConstructor, initialSigner).attach
  };
};

export const attachOnly = <F extends ContractFactory>(
  FactoryConstructor: FactoryConstructor<F>,
  initialSigner?: Signer
) => {
  return {
    attach: async (address: string, signer?: Signer): Promise<Contract<F>> => {
      const defaultSigner = initialSigner ?? ((await ethers.getSigners())[0] as any as Signer);
      return new FactoryConstructor(signer ?? defaultSigner).attach(address) as Contract<F>;
    }
  };
};

/* eslint-disable camelcase */
const getContracts = (signer?: Signer) => ({
  connect: (signer: Signer) => getContracts(signer),

  AttestationResolver: deployOrAttach('AttestationResolver', AttestationResolver__factory, signer),
  AttesterResolver: deployOrAttach('AttesterResolver', AttesterResolver__factory, signer),
  DataResolver: deployOrAttach('DataResolver', DataResolver__factory, signer),
  EAS: deployOrAttach('EAS', EAS__factory, signer),
  ExpirationTimeResolver: deployOrAttach('ExpirationTimeResolver', ExpirationTimeResolver__factory, signer),
  PayingResolver: deployOrAttach('PayingResolver', PayingResolver__factory, signer),
  PermissionedEIP712Proxy: deployOrAttach('PermissionedEIP712Proxy', PermissionedEIP712Proxy__factory, signer),
  RecipientResolver: deployOrAttach('RecipientResolver', RecipientResolver__factory, signer),
  RevocationResolver: deployOrAttach('RevocationResolver', RevocationResolver__factory, signer),
  SchemaRegistry: deployOrAttach('SchemaRegistry', SchemaRegistry__factory, signer),
  TestEAS: deployOrAttach('TestEAS', TestEAS__factory, signer),
  TestEIP712Proxy: deployOrAttach('TestEIP712Proxy', TestEIP712Proxy__factory, signer),
  TestEIP1271Signer: deployOrAttach('TestEIP1271Signer', TestEIP1271Signer__factory, signer),
  TestEIP1271Verifier: deployOrAttach('TestEIP1271Verifier', TestEIP1271Verifier__factory, signer),
  TestERC20Token: deployOrAttach('TestERC20Token', TestERC20Token__factory, signer),
  TestSchemaResolver: deployOrAttach('TestSchemaResolver', TestSchemaResolver__factory, signer),
  TokenResolver: deployOrAttach('TokenResolver', TokenResolver__factory, signer),
  ValueResolver: deployOrAttach('ValueResolver', ValueResolver__factory, signer)
});
/* eslint-enable camelcase */

export default getContracts();
