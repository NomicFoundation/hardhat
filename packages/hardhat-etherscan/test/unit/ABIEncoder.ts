import { assert } from "chai";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";

import { encodeArguments } from "../../src/ABIEncoder";

describe("constructor argument validation tests", () => {
  const sourceName = "TheContract.sol";
  const contractName = "TheContract";

  it("should validate empty argument list", async () => {
    const abi = [
      {
        inputs: [],
        stateMutability: "nonpayable",
        type: "constructor",
      },
    ];
    const constructorArguments: any[] = [];
    const encodedArguments = await encodeArguments(
      abi,
      sourceName,
      contractName,
      constructorArguments
    );
    assert.equal(encodedArguments, "");
  });

  it("should validate an argument list with a single element", async () => {
    const abi = [
      {
        inputs: [
          {
            name: "amount",
            type: "uint256",
          },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
      },
    ];
    const constructorArguments: any[] = [50];
    const encodedArguments = await encodeArguments(
      abi,
      sourceName,
      contractName,
      constructorArguments
    );
    assert.equal(
      encodedArguments,
      "0000000000000000000000000000000000000000000000000000000000000032"
    );
  });

  it("should fail gracefully with an unsafe integer", async () => {
    const abi = [
      {
        inputs: [
          {
            name: "amount",
            type: "uint256",
          },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
      },
    ];

    const amount = 1000000000000000000;
    assert.isFalse(Number.isSafeInteger(amount));
    const constructorArguments: any[] = [amount];

    await encodeArguments(
      abi,
      sourceName,
      contractName,
      constructorArguments
    ).then(
      () => {
        assert.fail("Promise should reject");
      },
      (reason) => {
        assert.instanceOf(reason, NomicLabsHardhatPluginError);
      }
    );
  });

  it("should throw when the argument list is too small", async () => {
    const abi = [
      {
        inputs: [
          {
            name: "amount",
            type: "uint256",
          },
          {
            name: "anotherAmount",
            type: "uint256",
          },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
      },
    ];
    const constructorArguments: any[] = [50];
    return encodeArguments(
      abi,
      sourceName,
      contractName,
      constructorArguments
    ).catch((reason) => {
      assert.instanceOf(reason, NomicLabsHardhatPluginError);
    });
  });

  it("should throw when the argument list is too big", async () => {
    const abi = [
      {
        inputs: [
          {
            name: "amount",
            type: "uint256",
          },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
      },
    ];
    const constructorArguments: any[] = [50, 100];
    return encodeArguments(
      abi,
      sourceName,
      contractName,
      constructorArguments
    ).catch((reason) => {
      assert.instanceOf(reason, NomicLabsHardhatPluginError);
    });
  });

  it("should encode multiple arguments", async () => {
    const abi = [
      {
        inputs: [
          {
            name: "amount",
            type: "uint256",
          },
          {
            name: "amount",
            type: "string",
          },
          {
            name: "amount",
            type: "address",
          },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
      },
    ];
    const constructorArguments: any[] = [
      50,
      "initializer",
      "0x752C8191E6b1Db38B41A8c8921F7a703F2969d18",
    ];
    const encodedArguments = await encodeArguments(
      abi,
      sourceName,
      contractName,
      constructorArguments
    );
    const expectedArguments = [
      "0000000000000000000000000000000000000000000000000000000000000032",
      "0000000000000000000000000000000000000000000000000000000000000060",
      "000000000000000000000000752c8191e6b1db38b41a8c8921f7a703f2969d18",
      "000000000000000000000000000000000000000000000000000000000000000b",
      "696e697469616c697a6572000000000000000000000000000000000000000000",
    ].join("");
    assert.equal(encodedArguments, expectedArguments);
  });

  it("should fail when one argument is of unexpected type", async () => {
    const abi = [
      {
        inputs: [
          {
            name: "amount",
            type: "uint256",
          },
          {
            name: "amount",
            type: "string",
          },
          {
            name: "amount",
            type: "address",
          },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
      },
    ];
    const constructorArguments: any[] = [
      50,
      "initializer",
      "0x752c8191e6b1db38b41a752C8191E6b1Db38B41A8c8921F7a703F2969d18",
    ];
    return encodeArguments(
      abi,
      sourceName,
      contractName,
      constructorArguments
    ).catch((reason) => {
      assert.instanceOf(reason, NomicLabsHardhatPluginError);
    });
  });

  it("should encode ABIv2 nested tuples", async () => {
    const abi = [
      {
        inputs: [
          {
            name: "t",
            type: "tuple",
            components: [
              {
                name: "x",
                type: "uint256",
              },
              {
                name: "y",
                type: "uint256",
              },
              {
                name: "nestedProperty",
                type: "tuple",
                components: [
                  {
                    name: "x",
                    type: "uint256",
                  },
                  {
                    name: "y",
                    type: "uint256",
                  },
                ],
              },
            ],
          },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
      },
    ];
    const constructorArguments: any[] = [
      {
        x: 8,
        y: 8 + 16,
        nestedProperty: {
          x: 8 + 16 * 2,
          y: 8 + 16 * 3,
        },
      },
    ];
    const encodedArguments = await encodeArguments(
      abi,
      sourceName,
      contractName,
      constructorArguments
    );
    const expectedArguments = [
      "0000000000000000000000000000000000000000000000000000000000000008",
      "0000000000000000000000000000000000000000000000000000000000000018",
      "0000000000000000000000000000000000000000000000000000000000000028",
      "0000000000000000000000000000000000000000000000000000000000000038",
    ].join("");
    assert.equal(encodedArguments, expectedArguments);
  });
});
