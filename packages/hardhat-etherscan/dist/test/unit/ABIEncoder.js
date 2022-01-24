"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const plugins_1 = require("hardhat/plugins");
const ABIEncoder_1 = require("../../src/ABIEncoder");
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
        const constructorArguments = [];
        const encodedArguments = await (0, ABIEncoder_1.encodeArguments)(abi, sourceName, contractName, constructorArguments);
        chai_1.assert.equal(encodedArguments, "");
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
        const constructorArguments = [50];
        const encodedArguments = await (0, ABIEncoder_1.encodeArguments)(abi, sourceName, contractName, constructorArguments);
        chai_1.assert.equal(encodedArguments, "0000000000000000000000000000000000000000000000000000000000000032");
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
        chai_1.assert.isFalse(Number.isSafeInteger(amount));
        const constructorArguments = [amount];
        await (0, ABIEncoder_1.encodeArguments)(abi, sourceName, contractName, constructorArguments).then(() => {
            chai_1.assert.fail("Promise should reject");
        }, (reason) => {
            chai_1.assert.instanceOf(reason, plugins_1.NomicLabsHardhatPluginError);
        });
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
        const constructorArguments = [50];
        return (0, ABIEncoder_1.encodeArguments)(abi, sourceName, contractName, constructorArguments).catch((reason) => {
            chai_1.assert.instanceOf(reason, plugins_1.NomicLabsHardhatPluginError);
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
        const constructorArguments = [50, 100];
        return (0, ABIEncoder_1.encodeArguments)(abi, sourceName, contractName, constructorArguments).catch((reason) => {
            chai_1.assert.instanceOf(reason, plugins_1.NomicLabsHardhatPluginError);
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
        const constructorArguments = [
            50,
            "initializer",
            "0x752C8191E6b1Db38B41A8c8921F7a703F2969d18",
        ];
        const encodedArguments = await (0, ABIEncoder_1.encodeArguments)(abi, sourceName, contractName, constructorArguments);
        const expectedArguments = [
            "0000000000000000000000000000000000000000000000000000000000000032",
            "0000000000000000000000000000000000000000000000000000000000000060",
            "000000000000000000000000752c8191e6b1db38b41a8c8921f7a703f2969d18",
            "000000000000000000000000000000000000000000000000000000000000000b",
            "696e697469616c697a6572000000000000000000000000000000000000000000",
        ].join("");
        chai_1.assert.equal(encodedArguments, expectedArguments);
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
        const constructorArguments = [
            50,
            "initializer",
            "0x752c8191e6b1db38b41a752C8191E6b1Db38B41A8c8921F7a703F2969d18",
        ];
        return (0, ABIEncoder_1.encodeArguments)(abi, sourceName, contractName, constructorArguments).catch((reason) => {
            chai_1.assert.instanceOf(reason, plugins_1.NomicLabsHardhatPluginError);
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
        const constructorArguments = [
            {
                x: 8,
                y: 8 + 16,
                nestedProperty: {
                    x: 8 + 16 * 2,
                    y: 8 + 16 * 3,
                },
            },
        ];
        const encodedArguments = await (0, ABIEncoder_1.encodeArguments)(abi, sourceName, contractName, constructorArguments);
        const expectedArguments = [
            "0000000000000000000000000000000000000000000000000000000000000008",
            "0000000000000000000000000000000000000000000000000000000000000018",
            "0000000000000000000000000000000000000000000000000000000000000028",
            "0000000000000000000000000000000000000000000000000000000000000038",
        ].join("");
        chai_1.assert.equal(encodedArguments, expectedArguments);
    });
});
//# sourceMappingURL=ABIEncoder.js.map