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
  event IncBy(address indexed sender);
  event AnotherEvent();

  constructor() payable {}

  function inc() public {
    value++;
    doubleValue = 2 * value;
    emit Inc();
  }

  function incTwice() public {
    inc();
    inc();
  }

  function incBy() public {
    value++;
    doubleValue = 2 * value;
    emit IncBy(msg.sender);
  }

  function emitsTwoEvents() public {
    emit Inc();
    emit AnotherEvent();
  }
}
*/
export const EXAMPLE_CONTRACT: { deploymentBytecode: string; abi: string[] } = {
  deploymentBytecode:
    "0x6080604052610331806100136000396000f3fe608060405234801561001057600080fd5b50600436106100625760003560e01c8063371303c0146100675780633fa4f24514610071578063720bc6bd1461008f578063b190115914610099578063b482c753146100a3578063e3778184146100ad575b600080fd5b61006f6100cb565b005b610079610125565b6040516100869190610227565b60405180910390f35b61009761012b565b005b6100a161019c565b005b6100ab6101f6565b005b6100b5610208565b6040516100c29190610227565b60405180910390f35b6000808154809291906100dd90610271565b919050555060005460026100f191906102b9565b6001819055507fccf19ee637b3555bb918b8270dfab3f2b4ec60236d1ab717296aa85d6921224f60405160405180910390a1565b60005481565b60008081548092919061013d90610271565b9190505550600054600261015191906102b9565b6001819055503373ffffffffffffffffffffffffffffffffffffffff167fc63093b080b72e1d1b077e809b40feb58237e148b3199da268424ed3c4782fb260405160405180910390a2565b7fccf19ee637b3555bb918b8270dfab3f2b4ec60236d1ab717296aa85d6921224f60405160405180910390a17f601d819e31a3cd164f83f7a7cf9cb5042ab1acff87b773c68f63d059c0af2dc060405160405180910390a1565b6101fe6100cb565b6102066100cb565b565b60015481565b6000819050919050565b6102218161020e565b82525050565b600060208201905061023c6000830184610218565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061027c8261020e565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82036102ae576102ad610242565b5b600182019050919050565b60006102c48261020e565b91506102cf8361020e565b92508282026102dd8161020e565b915082820484148315176102f4576102f3610242565b5b509291505056fea2646970667358221220a345852efad6090e92c33ef3f7f2f303c698e0476c8205f9fdfacb7b567f235664736f6c63430008110033",
  abi: [
    "event Inc()",
    "event IncBy(address indexed)",
    "event AnotherEvent()",
    "function value() public view returns (uint256)",
    "function doubleValue() public view returns (uint256)",
    "function inc() public",
    "function incTwice() public",
    "function incBy() public",
    "function emitsTwoEvents() public",
  ],
};

export type ExampleContract = BaseContract & {
  inc: BaseContractMethod<[], void, ContractTransactionResponse>;
  incTwice: BaseContractMethod<[], void, ContractTransactionResponse>;
  incBy: BaseContractMethod<[], void, ContractTransactionResponse>;
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
