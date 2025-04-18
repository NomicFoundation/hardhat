import {
  BaseContract,
  // eslint-disable-next-line prettier/prettier
  type BaseContractMethod,
  ContractTransactionResponse,
  // eslint-disable-next-line prettier/prettier
  type BigNumberish,
  // eslint-disable-next-line prettier/prettier
  type AddressLike,
} from "ethers";

export type MatchersContract = BaseContract & {
  panicAssert: BaseContractMethod<[], void, ContractTransactionResponse>;
  revertWithCustomErrorWithInt: BaseContractMethod<
    [BigNumberish],
    void,
    ContractTransactionResponse
  >;
  revertWithCustomErrorWithPair: BaseContractMethod<
    [BigNumberish, BigNumberish],
    void,
    ContractTransactionResponse
  >;
  revertWithCustomErrorWithUint: BaseContractMethod<
    [BigNumberish],
    void,
    ContractTransactionResponse
  >;
  revertWithCustomErrorWithUintAndString: BaseContractMethod<
    [BigNumberish, string],
    void,
    ContractTransactionResponse
  >;
  revertWithSomeCustomError: BaseContractMethod<
    [],
    void,
    ContractTransactionResponse
  >;
  revertsWith: BaseContractMethod<[string], void, ContractTransactionResponse>;
  revertsWithoutReason: BaseContractMethod<
    [],
    void,
    ContractTransactionResponse
  >;
  succeeds: BaseContractMethod<[], void, ContractTransactionResponse>;
};

export type ChangeEtherBalance = BaseContract & {
  returnHalf: BaseContractMethod<[], void, ContractTransactionResponse>;
  transferTo: BaseContractMethod<[string], void, ContractTransactionResponse>;
};

export type EventsContract = BaseContract & {
  doNotEmit: BaseContractMethod<[], void, ContractTransactionResponse>;
  emitBytes32: BaseContractMethod<[string], void, ContractTransactionResponse>;
  emitBytes32Array: BaseContractMethod<
    [string, string],
    void,
    ContractTransactionResponse
  >;
  emitBytes: BaseContractMethod<[string], void, ContractTransactionResponse>;
  emitIndexedBytes32: BaseContractMethod<
    [string],
    void,
    ContractTransactionResponse
  >;
  emitIndexedBytes: BaseContractMethod<
    [string],
    void,
    ContractTransactionResponse
  >;
  emitIndexedString: BaseContractMethod<
    [string],
    void,
    ContractTransactionResponse
  >;
  emitInt: BaseContractMethod<
    [BigNumberish],
    void,
    ContractTransactionResponse
  >;
  emitAddress: BaseContractMethod<
    [AddressLike],
    void,
    ContractTransactionResponse
  >;
  emitNestedUintFromAnotherContract: BaseContractMethod<
    [BigNumberish],
    void,
    ContractTransactionResponse
  >;
  emitNestedUintFromSameContract: BaseContractMethod<
    [BigNumberish],
    void,
    ContractTransactionResponse
  >;
  emitString: BaseContractMethod<[string], void, ContractTransactionResponse>;
  emitStruct: BaseContractMethod<
    [BigNumberish, BigNumberish],
    void,
    ContractTransactionResponse
  >;
  emitTwoUints: BaseContractMethod<
    [BigNumberish, BigNumberish],
    void,
    ContractTransactionResponse
  >;
  emitTwoUintsAndTwoStrings: BaseContractMethod<
    [BigNumberish, BigNumberish, string, string],
    void,
    ContractTransactionResponse
  >;
  emitUint: BaseContractMethod<
    [BigNumberish],
    void,
    ContractTransactionResponse
  >;
  emitUintAndString: BaseContractMethod<
    [BigNumberish, string],
    void,
    ContractTransactionResponse
  >;
  emitUintArray: BaseContractMethod<
    [BigNumberish, BigNumberish],
    void,
    ContractTransactionResponse
  >;
  emitUintTwice: BaseContractMethod<
    [BigNumberish, BigNumberish],
    void,
    ContractTransactionResponse
  >;
  emitWithoutArgs: BaseContractMethod<[], void, ContractTransactionResponse>;
};

export type AnotherContract = BaseContract & {};

export type OverrideEventContract = BaseContract & {
  emitSimpleEventWithUintArg: BaseContractMethod<
    [BigNumberish],
    void,
    ContractTransactionResponse
  >;
  emitSimpleEventWithoutArg: BaseContractMethod<
    [],
    void,
    ContractTransactionResponse
  >;
};
