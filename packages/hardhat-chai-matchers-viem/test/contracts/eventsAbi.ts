export const eventsAbi = [
  {
    inputs: [
      {
        internalType: "contract AnotherContract",
        name: "c",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "a",
        type: "address",
      },
    ],
    name: "WithAddressArg",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "b",
        type: "bytes32",
      },
    ],
    name: "WithBytes32Arg",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32[2]",
        name: "a",
        type: "bytes32[2]",
      },
    ],
    name: "WithBytes32Array",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes",
        name: "b",
        type: "bytes",
      },
    ],
    name: "WithBytesArg",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "b",
        type: "bytes32",
      },
    ],
    name: "WithIndexedBytes32Arg",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes",
        name: "b",
        type: "bytes",
      },
    ],
    name: "WithIndexedBytesArg",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "string",
        name: "s",
        type: "string",
      },
    ],
    name: "WithIndexedStringArg",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "int256",
        name: "i",
        type: "int256",
      },
    ],
    name: "WithIntArg",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "s",
        type: "string",
      },
    ],
    name: "WithStringArg",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "u",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "v",
            type: "uint256",
          },
        ],
        indexed: false,
        internalType: "struct Events.Struct",
        name: "s",
        type: "tuple",
      },
    ],
    name: "WithStructArg",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "s",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "t",
        type: "string",
      },
    ],
    name: "WithTwoStringArgs",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "u",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "v",
        type: "uint256",
      },
    ],
    name: "WithTwoUintArgs",
    type: "event",
  },
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
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256[2]",
        name: "a",
        type: "uint256[2]",
      },
    ],
    name: "WithUintArray",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [],
    name: "WithoutArgs",
    type: "event",
  },
  {
    inputs: [],
    name: "doNotEmit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "a",
        type: "address",
      },
    ],
    name: "emitAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "b",
        type: "bytes",
      },
    ],
    name: "emitBytes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "b",
        type: "bytes32",
      },
    ],
    name: "emitBytes32",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "b",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "c",
        type: "bytes32",
      },
    ],
    name: "emitBytes32Array",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "b",
        type: "bytes",
      },
    ],
    name: "emitIndexedBytes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "b",
        type: "bytes32",
      },
    ],
    name: "emitIndexedBytes32",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "s",
        type: "string",
      },
    ],
    name: "emitIndexedString",
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
    name: "emitInt",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "u",
        type: "uint256",
      },
    ],
    name: "emitNestedUintFromAnotherContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "u",
        type: "uint256",
      },
    ],
    name: "emitNestedUintFromSameContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "s",
        type: "string",
      },
    ],
    name: "emitString",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "u",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "v",
        type: "uint256",
      },
    ],
    name: "emitStruct",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "u",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "v",
        type: "uint256",
      },
    ],
    name: "emitTwoUints",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "u",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "v",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "s",
        type: "string",
      },
      {
        internalType: "string",
        name: "t",
        type: "string",
      },
    ],
    name: "emitTwoUintsAndTwoStrings",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
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
  {
    inputs: [
      {
        internalType: "uint256",
        name: "u",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "s",
        type: "string",
      },
    ],
    name: "emitUintAndString",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "u",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "v",
        type: "uint256",
      },
    ],
    name: "emitUintArray",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "u",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "v",
        type: "uint256",
      },
    ],
    name: "emitUintTwice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "emitWithoutArgs",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
