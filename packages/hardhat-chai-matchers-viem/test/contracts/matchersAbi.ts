export const matchersAbi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "AnotherCustomError",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
    ],
    name: "CustomErrorWithInt",
    type: "error",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "a",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "b",
            type: "uint256",
          },
        ],
        internalType: "struct Matchers.Pair",
        name: "",
        type: "tuple",
      },
    ],
    name: "CustomErrorWithPair",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "nameToForceEthersToUseAnArrayLikeWithNamedProperties",
        type: "uint256",
      },
    ],
    name: "CustomErrorWithUint",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "CustomErrorWithUintAndString",
    type: "error",
  },
  {
    inputs: [],
    name: "SomeCustomError",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [],
    name: "SomeEvent",
    type: "event",
  },
  {
    inputs: [],
    name: "panicAssert",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "panicAssertView",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "revertWithAnotherContractCustomError",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "revertWithAnotherContractCustomErrorView",
    outputs: [],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "revertWithAnotherCustomError",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "revertWithAnotherCustomErrorView",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "int256",
        name: "i",
        type: "int256",
      },
    ],
    name: "revertWithCustomErrorWithInt",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "int256",
        name: "i",
        type: "int256",
      },
    ],
    name: "revertWithCustomErrorWithIntView",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "a",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "b",
        type: "uint256",
      },
    ],
    name: "revertWithCustomErrorWithPair",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "a",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "b",
        type: "uint256",
      },
    ],
    name: "revertWithCustomErrorWithPairView",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "n",
        type: "uint256",
      },
    ],
    name: "revertWithCustomErrorWithUint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "n",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "s",
        type: "string",
      },
    ],
    name: "revertWithCustomErrorWithUintAndString",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "n",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "s",
        type: "string",
      },
    ],
    name: "revertWithCustomErrorWithUintAndStringView",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "n",
        type: "uint256",
      },
    ],
    name: "revertWithCustomErrorWithUintView",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "revertWithSomeCustomError",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "revertWithSomeCustomErrorView",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "reason",
        type: "string",
      },
    ],
    name: "revertsWith",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "reason",
        type: "string",
      },
    ],
    name: "revertsWithView",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "revertsWithoutReason",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "revertsWithoutReasonView",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "succeeds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "succeedsView",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
