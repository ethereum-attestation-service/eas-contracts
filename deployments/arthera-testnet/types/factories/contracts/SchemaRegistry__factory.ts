/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../common";
import type {
  SchemaRegistry,
  SchemaRegistryInterface,
} from "../../contracts/SchemaRegistry";

const _abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "AlreadyExists",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "uid",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "address",
        name: "registerer",
        type: "address",
      },
    ],
    name: "Registered",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "uid",
        type: "bytes32",
      },
    ],
    name: "getSchema",
    outputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "uid",
            type: "bytes32",
          },
          {
            internalType: "contract ISchemaResolver",
            name: "resolver",
            type: "address",
          },
          {
            internalType: "bool",
            name: "revocable",
            type: "bool",
          },
          {
            internalType: "string",
            name: "schema",
            type: "string",
          },
        ],
        internalType: "struct SchemaRecord",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "schema",
        type: "string",
      },
      {
        internalType: "contract ISchemaResolver",
        name: "resolver",
        type: "address",
      },
      {
        internalType: "bool",
        name: "revocable",
        type: "bool",
      },
    ],
    name: "register",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "version",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const _bytecode =
  "0x60e060405234801561001057600080fd5b5060016080819052600060a081905260c081905280610a696100478239600060fe0152600060d50152600060ac0152610a696000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c806354fd4d501461004657806360d7a27814610064578063a2ea7c6e14610085575b600080fd5b61004e6100a5565b60405161005b9190610668565b60405180910390f35b610077610072366004610682565b610148565b60405190815260200161005b565b610098610093366004610734565b6102f1565b60405161005b919061074d565b60606100d07f0000000000000000000000000000000000000000000000000000000000000000610419565b6100f97f0000000000000000000000000000000000000000000000000000000000000000610419565b6101227f0000000000000000000000000000000000000000000000000000000000000000610419565b604051602001610134939291906107a6565b604051602081830303815290604052905090565b60008060405180608001604052806000801b81526020018573ffffffffffffffffffffffffffffffffffffffff168152602001841515815260200187878080601f0160208091040260200160405190810160405280939291908181526020018383808284376000920182905250939094525092935091506101ca9050826104d7565b60008181526020819052604090205490915015610213576040517f23369fa600000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b80825260008181526020818152604091829020845181559084015160018201805493860151151574010000000000000000000000000000000000000000027fffffffffffffffffffffff00000000000000000000000000000000000000000090941673ffffffffffffffffffffffffffffffffffffffff9092169190911792909217909155606083015183919060028201906102af90826108ed565b50506040513381528291507f7d917fcbc9a29a9705ff9936ffa599500e4fd902e4486bae317414fe967b307c9060200160405180910390a29695505050505050565b604080516080810182526000808252602082018190529181019190915260608082015260008281526020818152604091829020825160808101845281548152600182015473ffffffffffffffffffffffffffffffffffffffff8116938201939093527401000000000000000000000000000000000000000090920460ff161515928201929092526002820180549192916060840191906103909061084b565b80601f01602080910402602001604051908101604052809291908181526020018280546103bc9061084b565b80156104095780601f106103de57610100808354040283529160200191610409565b820191906000526020600020905b8154815290600101906020018083116103ec57829003601f168201915b5050505050815250509050919050565b6060600061042683610517565b600101905060008167ffffffffffffffff8111156104465761044661081c565b6040519080825280601f01601f191660200182016040528015610470576020820181803683370190505b5090508181016020015b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff017f3031323334353637383961626364656600000000000000000000000000000000600a86061a8153600a850494508461047a57509392505050565b60008160600151826020015183604001516040516020016104fa93929190610a07565b604051602081830303815290604052805190602001209050919050565b6000807a184f03e93ff9f4daa797ed6e38ed64bf6a1f0100000000000000008310610560577a184f03e93ff9f4daa797ed6e38ed64bf6a1f010000000000000000830492506040015b6d04ee2d6d415b85acef8100000000831061058c576d04ee2d6d415b85acef8100000000830492506020015b662386f26fc1000083106105aa57662386f26fc10000830492506010015b6305f5e10083106105c2576305f5e100830492506008015b61271083106105d657612710830492506004015b606483106105e8576064830492506002015b600a83106105f4576001015b92915050565b60005b838110156106155781810151838201526020016105fd565b50506000910152565b600081518084526106368160208601602086016105fa565b601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169290920160200192915050565b60208152600061067b602083018461061e565b9392505050565b6000806000806060858703121561069857600080fd5b843567ffffffffffffffff808211156106b057600080fd5b818701915087601f8301126106c457600080fd5b8135818111156106d357600080fd5b8860208285010111156106e557600080fd5b6020928301965094505085013573ffffffffffffffffffffffffffffffffffffffff8116811461071457600080fd5b91506040850135801515811461072957600080fd5b939692955090935050565b60006020828403121561074657600080fd5b5035919050565b602081528151602082015273ffffffffffffffffffffffffffffffffffffffff60208301511660408201526040820151151560608201526000606083015160808084015261079e60a084018261061e565b949350505050565b600084516107b88184602089016105fa565b80830190507f2e0000000000000000000000000000000000000000000000000000000000000080825285516107f4816001850160208a016105fa565b6001920191820152835161080f8160028401602088016105fa565b0160020195945050505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b600181811c9082168061085f57607f821691505b602082108103610898577f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b50919050565b601f8211156108e857600081815260208120601f850160051c810160208610156108c55750805b601f850160051c820191505b818110156108e4578281556001016108d1565b5050505b505050565b815167ffffffffffffffff8111156109075761090761081c565b61091b81610915845461084b565b8461089e565b602080601f83116001811461096e57600084156109385750858301515b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600386901b1c1916600185901b1785556108e4565b6000858152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08616915b828110156109bb5788860151825594840194600190910190840161099c565b50858210156109f757878501517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600388901b60f8161c191681555b5050505050600190811b01905550565b60008451610a198184602089016105fa565b60609490941b7fffffffffffffffffffffffffffffffffffffffff000000000000000000000000169190930190815290151560f81b60148201526015019291505056fea164736f6c6343000813000a";

type SchemaRegistryConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: SchemaRegistryConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class SchemaRegistry__factory extends ContractFactory {
  constructor(...args: SchemaRegistryConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(overrides || {});
  }
  override deploy(overrides?: NonPayableOverrides & { from?: string }) {
    return super.deploy(overrides || {}) as Promise<
      SchemaRegistry & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): SchemaRegistry__factory {
    return super.connect(runner) as SchemaRegistry__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): SchemaRegistryInterface {
    return new Interface(_abi) as SchemaRegistryInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): SchemaRegistry {
    return new Contract(address, _abi, runner) as unknown as SchemaRegistry;
  }
}
