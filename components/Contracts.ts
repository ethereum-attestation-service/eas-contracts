import { ethers } from 'hardhat';
import { Contract as OldContract, ContractFactory, Overrides as OldOverrides } from '@ethersproject/contracts';
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

// Replace the type of the last param of a function
type LastIndex<T extends readonly any[]> = ((...t: T) => void) extends (x: any, ...r: infer R) => void
  ? Exclude<keyof T, keyof R>
  : never;
type ReplaceLastParam<TParams extends readonly any[], TReplace> = {
  [K in keyof TParams]: K extends LastIndex<TParams> ? TReplace : TParams[K];
};
type ReplaceLast<F, TReplace> = F extends (...args: infer T) => infer R
  ? (...args: ReplaceLastParam<T, TReplace>) => R
  : never;

type AsyncReturnType<T extends (...args: any) => any> = T extends (...args: any) => Promise<infer U>
  ? U
  : T extends (...args: any) => infer U
  ? U
  : any;

export type Overrides = OldOverrides & { from?: Signer };

export type ContractName = { __contractName__: string };
export type Contract = OldContract & ContractName;

const deployOrAttach = <F extends ContractFactory>(contractName: string, passedSigner?: Signer) => {
  type ParamsTypes = ReplaceLast<F['deploy'], Overrides>;

  return {
    deploy: async (...args: Parameters<ParamsTypes>): Promise<AsyncReturnType<F['deploy']> & ContractName> => {
      let defaultSigner = passedSigner ? passedSigner : (await ethers.getSigners())[0];

      const deployParamLength = (await ethers.getContractFactory(contractName)).deploy.length;

      // If similar length, override the last param
      if (args.length != 0 && args.length === deployParamLength) {
        const overrides = args.pop() as Overrides;

        const contractFactory = await ethers.getContractFactory(
          contractName,
          overrides.from ? overrides.from : defaultSigner
        );
        delete overrides.from;

        const contract = (await contractFactory.deploy(...args, overrides)) as AsyncReturnType<F['deploy']> &
          ContractName;
        contract.__contractName__ = contractName;
        return contract;
      }
      const contract = (await (
        await ethers.getContractFactory(contractName, defaultSigner)
      ).deploy(...args)) as AsyncReturnType<F['deploy']> & ContractName;
      contract.__contractName__ = contractName;
      return contract;
    },
    attach: attachOnly<F>(contractName, passedSigner).attach
  };
};

const attachOnly = <F extends ContractFactory>(contractName: string, passedSigner?: Signer) => {
  return {
    attach: async (address: string, signer?: Signer): Promise<AsyncReturnType<F['deploy']> & ContractName> => {
      let defaultSigner = passedSigner ? passedSigner : (await ethers.getSigners())[0];
      const contract = (await ethers.getContractAt(
        contractName,
        address,
        signer ? signer : defaultSigner
      )) as AsyncReturnType<F['deploy']> & ContractName;
      contract.__contractName__ = contractName;
      return contract;
    }
  };
};

const getContracts = (signer?: Signer) => {
  return {
    connect: (signer: Signer) => getContracts(signer),

    AORegistry: deployOrAttach<AORegistry__factory>('AORegistry', signer),
    EIP712Verifier: deployOrAttach<EIP712Verifier__factory>('EIP712Verifier', signer),
    EAS: deployOrAttach<EAS__factory>('EAS', signer),
    TestAOAttestationVerifier: deployOrAttach<TestAOAttestationVerifier__factory>('TestAOAttestationVerifier', signer),
    TestAOAttesterVerifier: deployOrAttach<TestAOAttesterVerifier__factory>('TestAOAttesterVerifier', signer),
    TestAODataVerifier: deployOrAttach<TestAODataVerifier__factory>('TestAODataVerifier', signer),
    TestAOExpirationTimeVerifier: deployOrAttach<TestAOExpirationTimeVerifier__factory>(
      'TestAOExpirationTimeVerifier',
      signer
    ),
    TestAORecipientVerifier: deployOrAttach<TestAORecipientVerifier__factory>('TestAORecipientVerifier', signer),
    TestAOValueVerifier: deployOrAttach<TestAOValueVerifier__factory>('TestAOValueVerifier', signer),
    TestEAS: deployOrAttach<TestEAS__factory>('TestEAS', signer)
  };
};

export default getContracts();
