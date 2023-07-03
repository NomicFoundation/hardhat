import type {
  BaseContract,
  BaseContractMethod,
  BigNumberish,
  ContractTransactionResponse,
} from "ethers";

/*
contract Example {
  uint public value;
  uint public doubleValue;
  event Inc();
  event AnotherEvent();

  constructor() payable {}

  function inc() public {
    value++;
    doubleValue = 2 * value;
    emit Inc();
  }

  function emitsTwoEvents() public {
    emit Inc();
    emit AnotherEvent();
  }
}
*/
export const EXAMPLE_CONTRACT = {
  deploymentBytecode:
    "0x6080604052610284806100136000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c8063371303c0146100515780633fa4f2451461005b578063b190115914610079578063e377818414610083575b600080fd5b6100596100a1565b005b6100636100fb565b604051610070919061017a565b60405180910390f35b610081610101565b005b61008b61015b565b604051610098919061017a565b60405180910390f35b6000808154809291906100b3906101c4565b919050555060005460026100c7919061020c565b6001819055507fccf19ee637b3555bb918b8270dfab3f2b4ec60236d1ab717296aa85d6921224f60405160405180910390a1565b60005481565b7fccf19ee637b3555bb918b8270dfab3f2b4ec60236d1ab717296aa85d6921224f60405160405180910390a17f601d819e31a3cd164f83f7a7cf9cb5042ab1acff87b773c68f63d059c0af2dc060405160405180910390a1565b60015481565b6000819050919050565b61017481610161565b82525050565b600060208201905061018f600083018461016b565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60006101cf82610161565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820361020157610200610195565b5b600182019050919050565b600061021782610161565b915061022283610161565b925082820261023081610161565b9150828204841483151761024757610246610195565b5b509291505056fea2646970667358221220bedfe038de0cf21194c025de5a282c3415bf29f716ef1af0073bc2c45d803e8164736f6c63430008110033",
  abi: [
    "event Inc()",
    "event AnotherEvent()",
    "function value() public view returns (uint256)",
    "function doubleValue() public view returns (uint256)",
    "function inc() public",
    "function emitsTwoEvents() public",
  ],
};

export type ExampleContract = BaseContract & {
  inc: BaseContractMethod<[], void, ContractTransactionResponse>;
  emitsTwoEvents: BaseContractMethod<[], void, ContractTransactionResponse>;
};

export type TestContractLib = BaseContract & {
  printNumber: BaseContractMethod<
    [BigNumberish],
    bigint,
    ContractTransactionResponse
  >;
};

export type GreeterContract = BaseContract & {
  greet: BaseContractMethod<[], string, string>;
  setGreeting: BaseContractMethod<[string], void, ContractTransactionResponse>;
};
