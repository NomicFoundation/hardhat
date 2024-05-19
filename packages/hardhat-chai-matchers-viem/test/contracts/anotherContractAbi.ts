export const anotherContractAbi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "u",
        type: "uint256",
      },
    ],
    name: "WithUintArg",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "u",
        type: "uint256",
      },
    ],
    name: "emitUint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
