/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type {
  Signer,
  AddressLike,
  ContractDeployTransaction,
  ContractRunner,
} from "ethers";
import type { NonPayableOverrides } from "../../../../../../common";
import type {
  EIP712Proxy,
  EIP712ProxyInterface,
} from "../../../../../../@ethereum-attestation-service/eas-contracts/contracts/eip712/proxy/EIP712Proxy";

const _abi = [
  {
    inputs: [
      {
        internalType: "contract IEAS",
        name: "eas",
        type: "address",
      },
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "AccessDenied",
    type: "error",
  },
  {
    inputs: [],
    name: "DeadlineExpired",
    type: "error",
  },
  {
    inputs: [],
    name: "ECDSAInvalidSignature",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "length",
        type: "uint256",
      },
    ],
    name: "ECDSAInvalidSignatureLength",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "ECDSAInvalidSignatureS",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidEAS",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidLength",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidShortString",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidSignature",
    type: "error",
  },
  {
    inputs: [],
    name: "NotFound",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "str",
        type: "string",
      },
    ],
    name: "StringTooLong",
    type: "error",
  },
  {
    inputs: [],
    name: "UsedSignature",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [],
    name: "EIP712DomainChanged",
    type: "event",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "schema",
            type: "bytes32",
          },
          {
            components: [
              {
                internalType: "address",
                name: "recipient",
                type: "address",
              },
              {
                internalType: "uint64",
                name: "expirationTime",
                type: "uint64",
              },
              {
                internalType: "bool",
                name: "revocable",
                type: "bool",
              },
              {
                internalType: "bytes32",
                name: "refUID",
                type: "bytes32",
              },
              {
                internalType: "bytes",
                name: "data",
                type: "bytes",
              },
              {
                internalType: "uint256",
                name: "value",
                type: "uint256",
              },
            ],
            internalType: "struct AttestationRequestData",
            name: "data",
            type: "tuple",
          },
          {
            components: [
              {
                internalType: "uint8",
                name: "v",
                type: "uint8",
              },
              {
                internalType: "bytes32",
                name: "r",
                type: "bytes32",
              },
              {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
              },
            ],
            internalType: "struct Signature",
            name: "signature",
            type: "tuple",
          },
          {
            internalType: "address",
            name: "attester",
            type: "address",
          },
          {
            internalType: "uint64",
            name: "deadline",
            type: "uint64",
          },
        ],
        internalType: "struct DelegatedProxyAttestationRequest",
        name: "delegatedRequest",
        type: "tuple",
      },
    ],
    name: "attestByDelegation",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "eip712Domain",
    outputs: [
      {
        internalType: "bytes1",
        name: "fields",
        type: "bytes1",
      },
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "version",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "chainId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "verifyingContract",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "salt",
        type: "bytes32",
      },
      {
        internalType: "uint256[]",
        name: "extensions",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAttestTypeHash",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "uid",
        type: "bytes32",
      },
    ],
    name: "getAttester",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getDomainSeparator",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getEAS",
    outputs: [
      {
        internalType: "contract IEAS",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getName",
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
  {
    inputs: [],
    name: "getRevokeTypeHash",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "schema",
            type: "bytes32",
          },
          {
            components: [
              {
                internalType: "address",
                name: "recipient",
                type: "address",
              },
              {
                internalType: "uint64",
                name: "expirationTime",
                type: "uint64",
              },
              {
                internalType: "bool",
                name: "revocable",
                type: "bool",
              },
              {
                internalType: "bytes32",
                name: "refUID",
                type: "bytes32",
              },
              {
                internalType: "bytes",
                name: "data",
                type: "bytes",
              },
              {
                internalType: "uint256",
                name: "value",
                type: "uint256",
              },
            ],
            internalType: "struct AttestationRequestData[]",
            name: "data",
            type: "tuple[]",
          },
          {
            components: [
              {
                internalType: "uint8",
                name: "v",
                type: "uint8",
              },
              {
                internalType: "bytes32",
                name: "r",
                type: "bytes32",
              },
              {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
              },
            ],
            internalType: "struct Signature[]",
            name: "signatures",
            type: "tuple[]",
          },
          {
            internalType: "address",
            name: "attester",
            type: "address",
          },
          {
            internalType: "uint64",
            name: "deadline",
            type: "uint64",
          },
        ],
        internalType: "struct MultiDelegatedProxyAttestationRequest[]",
        name: "multiDelegatedRequests",
        type: "tuple[]",
      },
    ],
    name: "multiAttestByDelegation",
    outputs: [
      {
        internalType: "bytes32[]",
        name: "",
        type: "bytes32[]",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "schema",
            type: "bytes32",
          },
          {
            components: [
              {
                internalType: "bytes32",
                name: "uid",
                type: "bytes32",
              },
              {
                internalType: "uint256",
                name: "value",
                type: "uint256",
              },
            ],
            internalType: "struct RevocationRequestData[]",
            name: "data",
            type: "tuple[]",
          },
          {
            components: [
              {
                internalType: "uint8",
                name: "v",
                type: "uint8",
              },
              {
                internalType: "bytes32",
                name: "r",
                type: "bytes32",
              },
              {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
              },
            ],
            internalType: "struct Signature[]",
            name: "signatures",
            type: "tuple[]",
          },
          {
            internalType: "address",
            name: "revoker",
            type: "address",
          },
          {
            internalType: "uint64",
            name: "deadline",
            type: "uint64",
          },
        ],
        internalType: "struct MultiDelegatedProxyRevocationRequest[]",
        name: "multiDelegatedRequests",
        type: "tuple[]",
      },
    ],
    name: "multiRevokeByDelegation",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "schema",
            type: "bytes32",
          },
          {
            components: [
              {
                internalType: "bytes32",
                name: "uid",
                type: "bytes32",
              },
              {
                internalType: "uint256",
                name: "value",
                type: "uint256",
              },
            ],
            internalType: "struct RevocationRequestData",
            name: "data",
            type: "tuple",
          },
          {
            components: [
              {
                internalType: "uint8",
                name: "v",
                type: "uint8",
              },
              {
                internalType: "bytes32",
                name: "r",
                type: "bytes32",
              },
              {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
              },
            ],
            internalType: "struct Signature",
            name: "signature",
            type: "tuple",
          },
          {
            internalType: "address",
            name: "revoker",
            type: "address",
          },
          {
            internalType: "uint64",
            name: "deadline",
            type: "uint64",
          },
        ],
        internalType: "struct DelegatedProxyRevocationRequest",
        name: "delegatedRequest",
        type: "tuple",
      },
    ],
    name: "revokeByDelegation",
    outputs: [],
    stateMutability: "payable",
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
  "0x6101e060405234801561001157600080fd5b50604051612d2e380380612d2e83398101604081905261003091610211565b6040805180820190915260058152640312e342e360dc1b60208201526001608052600460a052600060c081905282919061006b90839061015d565b6101805261007a81600161015d565b6101a05281516020808401919091206101405281519082012061016052466101005261010a6101405161016051604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f60208201529081019290925260608201524660808201523060a082015260009060c00160405160208183030381529060405280519060200120905090565b60e052505030610120526001600160a01b03821661013b576040516341bc07ff60e11b815260040160405180910390fd5b6001600160a01b0382166101c0526002610155828261036e565b505050610483565b60006020835110156101795761017283610190565b905061018a565b81610184848261036e565b5060ff90505b92915050565b600080829050601f815111156101c4578260405163305a27a960e01b81526004016101bb919061042c565b60405180910390fd5b80516101cf8261045f565b179392505050565b634e487b7160e01b600052604160045260246000fd5b60005b838110156102085781810151838201526020016101f0565b50506000910152565b6000806040838503121561022457600080fd5b82516001600160a01b038116811461023b57600080fd5b60208401519092506001600160401b0381111561025757600080fd5b8301601f8101851361026857600080fd5b80516001600160401b03811115610281576102816101d7565b604051601f8201601f19908116603f011681016001600160401b03811182821017156102af576102af6101d7565b6040528181528282016020018710156102c757600080fd5b6102d88260208301602086016101ed565b8093505050509250929050565b600181811c908216806102f957607f821691505b60208210810361031957634e487b7160e01b600052602260045260246000fd5b50919050565b601f82111561036957806000526020600020601f840160051c810160208510156103465750805b601f840160051c820191505b818110156103665760008155600101610352565b50505b505050565b81516001600160401b03811115610387576103876101d7565b61039b8161039584546102e5565b8461031f565b6020601f8211600181146103cf57600083156103b75750848201515b600019600385901b1c1916600184901b178455610366565b600084815260208120601f198516915b828110156103ff57878501518255602094850194600190920191016103df565b508482101561041d5786840151600019600387901b60f8161c191681555b50505050600190811b01905550565b602081526000825180602084015261044b8160408501602087016101ed565b601f01601f19169190910160400192915050565b805160208083015191908110156103195760001960209190910360031b1b16919050565b60805160a05160c05160e05161010051610120516101405161016051610180516101a0516101c051612809610525600039600081816101e4015281816104d1015281816105e901528181610a5b0152610c3c0152600061127c0152600061124f0152600061138901526000611361015260006112bc015260006112e601526000611310015260006107760152600061074d0152600061072401526128096000f3fe6080604052600436106100c75760003560e01c806365c40b9c11610074578063a6d4dbc71161004e578063a6d4dbc714610250578063b83010d314610263578063ed24911d1461029657600080fd5b806365c40b9c146101d557806384b0196e14610208578063954115251461023057600080fd5b806317d7de7c116100a557806317d7de7c1461018b5780633c042715146101ad57806354fd4d50146101c057600080fd5b80630eabf660146100cc57806310d736d5146100e157806312b11a171461014e575b600080fd5b6100df6100da3660046119be565b6102ab565b005b3480156100ed57600080fd5b506101246100fc366004611a00565b60009081526003602052604090205473ffffffffffffffffffffffffffffffffffffffff1690565b60405173ffffffffffffffffffffffffffffffffffffffff90911681526020015b60405180910390f35b34801561015a57600080fd5b507fea02ffba7dcb45f6fc649714d23f315eef12e3b27f9a7735d8d8bf41eb2b1af15b604051908152602001610145565b34801561019757600080fd5b506101a0610540565b6040516101459190611a87565b61017d6101bb366004611aa1565b6105d2565b3480156101cc57600080fd5b506101a061071d565b3480156101e157600080fd5b507f0000000000000000000000000000000000000000000000000000000000000000610124565b34801561021457600080fd5b5061021d6107c0565b6040516101459796959493929190611adc565b61024361023e3660046119be565b610822565b6040516101459190611b9d565b6100df61025e366004611be0565b610c23565b34801561026f57600080fd5b507f78a69a78c1a55cdff5cbf949580b410778cd9e4d1ecbe6f06a7fa8dc2441b57d61017d565b3480156102a257600080fd5b5061017d610d23565b8060008167ffffffffffffffff8111156102c7576102c7611bfc565b60405190808252806020026020018201604052801561030d57816020015b6040805180820190915260008152606060208201528152602001906001900390816102e55790505b50905060005b8281101561049357600085858381811061032f5761032f611c2b565b90506020028101906103419190611c5a565b61034a90611ec7565b602081015180519192509080158061036757508260400151518114155b1561039e576040517f947d5a8400000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60005b818110156104485760008382815181106103bd576103bd611c2b565b6020026020010151905061043f6040518060a0016040528087600001518152602001838152602001876040015185815181106103fb576103fb611c2b565b60200260200101518152602001876060015173ffffffffffffffffffffffffffffffffffffffff168152602001876080015167ffffffffffffffff16815250610d32565b506001016103a1565b506040518060400160405280846000015181526020018381525085858151811061047457610474611c2b565b602002602001018190525050505061048c8160010190565b9050610313565b506040517f4cb7e9e500000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff7f00000000000000000000000000000000000000000000000000000000000000001690634cb7e9e5903490610508908590600401611fc8565b6000604051808303818588803b15801561052157600080fd5b505af1158015610535573d6000803e3d6000fd5b505050505050505050565b60606002805461054f9061209f565b80601f016020809104026020016040519081016040528092919081815260200182805461057b9061209f565b80156105c85780601f1061059d576101008083540402835291602001916105c8565b820191906000526020600020905b8154815290600101906020018083116105ab57829003601f168201915b5050505050905090565b60006105e56105e083612218565b610fa8565b60007f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663f17325e7346040518060400160405280876000013581526020018780602001906106499190612291565b610652906122c5565b8152506040518363ffffffff1660e01b81526004016106719190612344565b60206040518083038185885af115801561068f573d6000803e3d6000fd5b50505050506040513d601f19601f820116820180604052508101906106b49190612371565b90506106c660c0840160a0850161238a565b600082815260036020526040902080547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff9290921691909117905592915050565b60606107487f000000000000000000000000000000000000000000000000000000000000000061118a565b6107717f000000000000000000000000000000000000000000000000000000000000000061118a565b61079a7f000000000000000000000000000000000000000000000000000000000000000061118a565b6040516020016107ac939291906123a5565b604051602081830303815290604052905090565b6000606080600080600060606107d4611248565b6107dc611275565b604080516000808252602082019092527f0f000000000000000000000000000000000000000000000000000000000000009b939a50919850469750309650945092509050565b60608160008167ffffffffffffffff81111561084057610840611bfc565b60405190808252806020026020018201604052801561088657816020015b60408051808201909152600081526060602082015281526020019060019003908161085e5790505b50905060005b82811015610a5657368686838181106108a7576108a7611c2b565b90506020028101906108b99190611c5a565b90503660006108cb602084018461243c565b9092509050808015806108ec57506108e660408501856124a4565b90508114155b15610923576040517f947d5a8400000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60005b81811015610a04576109fc6040518060a001604052808760000135815260200186868581811061095857610958611c2b565b905060200281019061096a9190612291565b610973906122c5565b815260200161098560408901896124a4565b8581811061099557610995611c2b565b9050606002018036038101906109ab919061250b565b81526020016109c06080890160608a0161238a565b73ffffffffffffffffffffffffffffffffffffffff1681526020016109eb60a0890160808a01612527565b67ffffffffffffffff169052610fa8565b600101610926565b50604080518082019091528435815260208101610a218486612542565b815250868681518110610a3657610a36611c2b565b602002602001018190525050505050610a4f8160010190565b905061088c565b5060007f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff166344adc90e34846040518363ffffffff1660e01b8152600401610ab391906125a8565b60006040518083038185885af1158015610ad1573d6000803e3d6000fd5b50505050506040513d6000823e601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0168201604052610b18919081019061269b565b90506000805b84811015610c155736888883818110610b3957610b39611c2b565b9050602002810190610b4b9190611c5a565b9050366000610b5d602084018461243c565b90925090508060005b81811015610bff57610b7e608086016060870161238a565b600360008a8a81518110610b9457610b94611c2b565b6020026020010151815260200190815260200160002060006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550866001019650610bf88160010190565b9050610b66565b5050505050610c0e8160010190565b9050610b1e565b509093505050505b92915050565b610c3a610c3536839003830183612731565b610d32565b7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663469262673460405180604001604052808560000135815260200185602001803603810190610ca0919061279f565b90526040517fffffffff0000000000000000000000000000000000000000000000000000000060e085901b16815281516004820152602091820151805160248301529091015160448201526064016000604051808303818588803b158015610d0757600080fd5b505af1158015610d1b573d6000803e3d6000fd5b505050505050565b6000610d2d6112a2565b905090565b608081015167ffffffffffffffff1615801590610d6657504267ffffffffffffffff16816080015167ffffffffffffffff16105b15610d9d576040517f1ab7da6b00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60208082015180516000908152600390925260409091205473ffffffffffffffffffffffffffffffffffffffff1680610e02576040517fc5723b5100000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b826060015173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614610e6b576040517f4ca8886700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6040830151610e79816113da565b606080850151855185516020808801516080808b0151604080517f78a69a78c1a55cdff5cbf949580b410778cd9e4d1ecbe6f06a7fa8dc2441b57d9581019590955273ffffffffffffffffffffffffffffffffffffffff90971696840196909652958201939093529384015260a083015267ffffffffffffffff1660c0820152600090610f1f9060e0015b604051602081830303815290604052805190602001206114e8565b9050846060015173ffffffffffffffffffffffffffffffffffffffff16610f5482846000015185602001518660400151611530565b73ffffffffffffffffffffffffffffffffffffffff1614610fa1576040517f8baa579f00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5050505050565b608081015167ffffffffffffffff1615801590610fdc57504267ffffffffffffffff16816080015167ffffffffffffffff16105b15611013576040517f1ab7da6b00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60208101516040820151611026816113da565b60006111027fea02ffba7dcb45f6fc649714d23f315eef12e3b27f9a7735d8d8bf41eb2b1af160001b8560600151866000015186600001518760200151886040015189606001518a60800151805190602001208b60a001518d60800151604051602001610f049a99989796959493929190998a5273ffffffffffffffffffffffffffffffffffffffff98891660208b015260408a019790975294909616606088015267ffffffffffffffff928316608088015290151560a087015260c086015260e0850193909352610100840152166101208201526101400190565b9050836060015173ffffffffffffffffffffffffffffffffffffffff1661113782846000015185602001518660400151611530565b73ffffffffffffffffffffffffffffffffffffffff1614611184576040517f8baa579f00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b50505050565b606060006111978361155e565b600101905060008167ffffffffffffffff8111156111b7576111b7611bfc565b6040519080825280601f01601f1916602001820160405280156111e1576020820181803683370190505b5090508181016020015b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff017f3031323334353637383961626364656600000000000000000000000000000000600a86061a8153600a85049450846111eb57509392505050565b6060610d2d7f00000000000000000000000000000000000000000000000000000000000000006000611640565b6060610d2d7f00000000000000000000000000000000000000000000000000000000000000006001611640565b60003073ffffffffffffffffffffffffffffffffffffffff7f00000000000000000000000000000000000000000000000000000000000000001614801561130857507f000000000000000000000000000000000000000000000000000000000000000046145b1561133257507f000000000000000000000000000000000000000000000000000000000000000090565b610d2d604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f60208201527f0000000000000000000000000000000000000000000000000000000000000000918101919091527f000000000000000000000000000000000000000000000000000000000000000060608201524660808201523060a082015260009060c00160405160208183030381529060405280519060200120905090565b8051602080830151604080850151905160f89490941b7fff00000000000000000000000000000000000000000000000000000000000000169284019290925260218301526041820152600090606101604051602081830303815290604052905060048160405161144a91906127bb565b9081526040519081900360200190205460ff1615611494576040517fcce9a82400000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60016004826040516114a691906127bb565b90815260405190819003602001902080549115157fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff009092169190911790555050565b6000610c1d6114f56112a2565b836040517f19010000000000000000000000000000000000000000000000000000000000008152600281019290925260228201526042902090565b600080600080611542888888886116eb565b92509250925061155282826117e5565b50909695505050505050565b6000807a184f03e93ff9f4daa797ed6e38ed64bf6a1f01000000000000000083106115a7577a184f03e93ff9f4daa797ed6e38ed64bf6a1f010000000000000000830492506040015b6d04ee2d6d415b85acef810000000083106115d3576d04ee2d6d415b85acef8100000000830492506020015b662386f26fc1000083106115f157662386f26fc10000830492506010015b6305f5e1008310611609576305f5e100830492506008015b612710831061161d57612710830492506004015b6064831061162f576064830492506002015b600a8310610c1d5760010192915050565b606060ff831461165a57611653836118f2565b9050610c1d565b8180546116669061209f565b80601f01602080910402602001604051908101604052809291908181526020018280546116929061209f565b80156116df5780601f106116b4576101008083540402835291602001916116df565b820191906000526020600020905b8154815290600101906020018083116116c257829003601f168201915b50505050509050610c1d565b600080807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a084111561172657506000915060039050826117db565b604080516000808252602082018084528a905260ff891692820192909252606081018790526080810186905260019060a0016020604051602081039080840390855afa15801561177a573d6000803e3d6000fd5b50506040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0015191505073ffffffffffffffffffffffffffffffffffffffff81166117d1575060009250600191508290506117db565b9250600091508190505b9450945094915050565b60008260038111156117f9576117f96127cd565b03611802575050565b6001826003811115611816576118166127cd565b0361184d576040517ff645eedf00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6002826003811115611861576118616127cd565b036118a0576040517ffce698f7000000000000000000000000000000000000000000000000000000008152600481018290526024015b60405180910390fd5b60038260038111156118b4576118b46127cd565b036118ee576040517fd78bce0c00000000000000000000000000000000000000000000000000000000815260048101829052602401611897565b5050565b606060006118ff83611931565b604080516020808252818301909252919250600091906020820181803683375050509182525060208101929092525090565b600060ff8216601f811115610c1d576040517fb3512b0c00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60008083601f84011261198457600080fd5b50813567ffffffffffffffff81111561199c57600080fd5b6020830191508360208260051b85010111156119b757600080fd5b9250929050565b600080602083850312156119d157600080fd5b823567ffffffffffffffff8111156119e857600080fd5b6119f485828601611972565b90969095509350505050565b600060208284031215611a1257600080fd5b5035919050565b60005b83811015611a34578181015183820152602001611a1c565b50506000910152565b60008151808452611a55816020860160208601611a19565b601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169290920160200192915050565b602081526000611a9a6020830184611a3d565b9392505050565b600060208284031215611ab357600080fd5b813567ffffffffffffffff811115611aca57600080fd5b820160e08185031215611a9a57600080fd5b7fff000000000000000000000000000000000000000000000000000000000000008816815260e060208201526000611b1760e0830189611a3d565b8281036040840152611b298189611a3d565b6060840188905273ffffffffffffffffffffffffffffffffffffffff8716608085015260a0840186905283810360c08501528451808252602080870193509091019060005b81811015611b8c578351835260209384019390920191600101611b6e565b50909b9a5050505050505050505050565b602080825282518282018190526000918401906040840190835b81811015611bd5578351835260209384019390920191600101611bb7565b509095945050505050565b6000610100828403128015611bf457600080fd5b509092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600082357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff61833603018112611c8e57600080fd5b9190910192915050565b60405160a0810167ffffffffffffffff81118282101715611cbb57611cbb611bfc565b60405290565b60405160c0810167ffffffffffffffff81118282101715611cbb57611cbb611bfc565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016810167ffffffffffffffff81118282101715611d2b57611d2b611bfc565b604052919050565b600067ffffffffffffffff821115611d4d57611d4d611bfc565b5060051b60200190565b600060408284031215611d6957600080fd5b6040805190810167ffffffffffffffff81118282101715611d8c57611d8c611bfc565b604052823581526020928301359281019290925250919050565b600060608284031215611db857600080fd5b6040516060810167ffffffffffffffff81118282101715611ddb57611ddb611bfc565b604052905080823560ff81168114611df257600080fd5b815260208381013590820152604092830135920191909152919050565b600082601f830112611e2057600080fd5b8135611e33611e2e82611d33565b611ce4565b80828252602082019150602060608402860101925085831115611e5557600080fd5b602085015b83811015611e7c57611e6c8782611da6565b8352602090920191606001611e5a565b5095945050505050565b803573ffffffffffffffffffffffffffffffffffffffff81168114611eaa57600080fd5b919050565b803567ffffffffffffffff81168114611eaa57600080fd5b600060a08236031215611ed957600080fd5b611ee1611c98565b82358152602083013567ffffffffffffffff811115611eff57600080fd5b830136601f820112611f1057600080fd5b8035611f1e611e2e82611d33565b8082825260208201915060208360061b850101925036831115611f4057600080fd5b6020840193505b82841015611f6c57611f593685611d57565b8252602082019150604084019350611f47565b6020850152505050604083013567ffffffffffffffff811115611f8e57600080fd5b611f9a36828601611e0f565b604083015250611fac60608401611e86565b6060820152611fbd60808401611eaf565b608082015292915050565b6000602082016020835280845180835260408501915060408160051b86010192506020860160005b82811015612093578685037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc00184528151805186526020908101516040828801819052815190880181905291019060009060608801905b8083101561207b5761206482855180518252602090810151910152565b604082019150602084019350600183019250612047565b50965050506020938401939190910190600101611ff0565b50929695505050505050565b600181811c908216806120b357607f821691505b6020821081036120ec577f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b50919050565b600082601f83011261210357600080fd5b813567ffffffffffffffff81111561211d5761211d611bfc565b61214e60207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f84011601611ce4565b81815284602083860101111561216357600080fd5b816020850160208301376000918101602001919091529392505050565b600060c0828403121561219257600080fd5b61219a611cc1565b90506121a582611e86565b81526121b360208301611eaf565b6020820152604082013580151581146121cb57600080fd5b604082015260608281013590820152608082013567ffffffffffffffff8111156121f457600080fd5b612200848285016120f2565b60808301525060a09182013591810191909152919050565b600060e0823603121561222a57600080fd5b612232611c98565b82358152602083013567ffffffffffffffff81111561225057600080fd5b61225c36828601612180565b60208301525061226f3660408501611da6565b604082015261228060a08401611e86565b6060820152611fbd60c08401611eaf565b600082357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff41833603018112611c8e57600080fd5b6000610c1d3683612180565b73ffffffffffffffffffffffffffffffffffffffff815116825267ffffffffffffffff6020820151166020830152604081015115156040830152606081015160608301526000608082015160c0608085015261233060c0850182611a3d565b60a093840151949093019390935250919050565b60208152815160208201526000602083015160408084015261236960608401826122d1565b949350505050565b60006020828403121561238357600080fd5b5051919050565b60006020828403121561239c57600080fd5b611a9a82611e86565b600084516123b7818460208901611a19565b7f2e0000000000000000000000000000000000000000000000000000000000000090830190815284516123f1816001840160208901611a19565b7f2e0000000000000000000000000000000000000000000000000000000000000060019290910191820152835161242f816002840160208801611a19565b0160020195945050505050565b60008083357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe184360301811261247157600080fd5b83018035915067ffffffffffffffff82111561248c57600080fd5b6020019150600581901b36038213156119b757600080fd5b60008083357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe18436030181126124d957600080fd5b83018035915067ffffffffffffffff8211156124f457600080fd5b60200191506060810236038213156119b757600080fd5b60006060828403121561251d57600080fd5b611a9a8383611da6565b60006020828403121561253957600080fd5b611a9a82611eaf565b6000612550611e2e84611d33565b8381526020810190600585901b84013681111561256c57600080fd5b845b81811015611bd557803567ffffffffffffffff81111561258d57600080fd5b61259936828901612180565b8552506020938401930161256e565b6000602082016020835280845180835260408501915060408160051b86010192506020860160005b82811015612093577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc0878603018452815180518652602090810151604082880181905281519088018190529101906060600582901b88018101919088019060005b81811015612681577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa08a850301835261266b8486516122d1565b6020958601959094509290920191600101612631565b5091975050506020948501949290920191506001016125d0565b6000602082840312156126ad57600080fd5b815167ffffffffffffffff8111156126c457600080fd5b8201601f810184136126d557600080fd5b80516126e3611e2e82611d33565b8082825260208201915060208360051b85010192508683111561270557600080fd5b6020840193505b8284101561272757835182526020938401939091019061270c565b9695505050505050565b600061010082840312801561274557600080fd5b5061274e611c98565b8235815261275f8460208501611d57565b60208201526127718460608501611da6565b604082015261278260c08401611e86565b606082015261279360e08401611eaf565b60808201529392505050565b6000604082840312156127b157600080fd5b611a9a8383611d57565b60008251611c8e818460208701611a19565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fdfea164736f6c634300081b000a";

type EIP712ProxyConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: EIP712ProxyConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class EIP712Proxy__factory extends ContractFactory {
  constructor(...args: EIP712ProxyConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    eas: AddressLike,
    name: string,
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(eas, name, overrides || {});
  }
  override deploy(
    eas: AddressLike,
    name: string,
    overrides?: NonPayableOverrides & { from?: string }
  ) {
    return super.deploy(eas, name, overrides || {}) as Promise<
      EIP712Proxy & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): EIP712Proxy__factory {
    return super.connect(runner) as EIP712Proxy__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): EIP712ProxyInterface {
    return new Interface(_abi) as EIP712ProxyInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): EIP712Proxy {
    return new Contract(address, _abi, runner) as unknown as EIP712Proxy;
  }
}
