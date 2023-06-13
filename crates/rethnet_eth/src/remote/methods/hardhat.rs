use hashbrown::HashMap;

use crate::{
    remote::{sequence_to_single, single_to_sequence, ZeroXPrefixedBytes},
    Address, B256, U256,
};

/// Compiler input and output structures used as parameters to Hardhat RPC methods
pub mod compiler_io;

/// an invocation of a hardhat_* RPC method, with its parameters
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(tag = "method", content = "params")]
#[allow(clippy::large_enum_variant)]
pub enum HardhatMethodInvocation {
    /// hardhat_addCompilationResult
    #[serde(rename = "hardhat_addCompilationResult")]
    AddCompilationResult(
        /// solc version:
        String,
        compiler_io::CompilerInput,
        compiler_io::CompilerOutput,
    ),
    /// hardhat_dropTransaction
    #[serde(
        rename = "hardhat_dropTransaction",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    DropTransaction(B256),
    /// hardhat_getAutomine
    #[serde(rename = "hardhat_getAutomine")]
    GetAutomine(),
    /// hardhat_getStackTraceFailuresCount
    #[serde(rename = "hardhat_getStackTraceFailuresCount")]
    GetStackTraceFailuresCount(),
    /// hardhat_impersonateAccount
    #[serde(
        rename = "hardhat_impersonateAccount",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    ImpersonateAccount(Address),
    /// hardhat_intervalMine
    #[serde(rename = "hardhat_intervalMine")]
    IntervalMine(),
    /// hardhat_metadata
    #[serde(rename = "hardhat_metadata")]
    Metadata(),
    /// hardhat_mine
    #[serde(rename = "hardhat_mine")]
    Mine(
        /// block count:
        U256,
        /// interval:
        U256,
    ),
    /// hardhat_reset
    #[serde(
        rename = "hardhat_reset",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    Reset(Option<RpcHardhatNetworkConfig>),
    /// hardhat_setBalance
    #[serde(rename = "hardhat_setBalance")]
    SetBalance(Address, U256),
    /// hardhat_setCode
    #[serde(rename = "hardhat_setCode")]
    SetCode(Address, ZeroXPrefixedBytes),
    /// hardhat_setCoinbase
    #[serde(
        rename = "hardhat_setCoinbase",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetCoinbase(Address),
    /// hardhat_setLoggingEnabled
    #[serde(
        rename = "hardhat_setLoggingEnabled",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetLoggingEnabled(bool),
    /// hardhat_setMinGasPrice
    #[serde(
        rename = "hardhat_setMinGasPrice",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetMinGasPrice(U256),
    /// hardhat_setNextBlockBaseFeePerGas
    #[serde(
        rename = "hardhat_setNextBlockBaseFeePerGas",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetNextBlockBaseFeePerGas(U256),
    /// hardhat_setNonce
    #[serde(rename = "hardhat_setNonce")]
    SetNonce(Address, U256),
    /// hardhat_setPrevRandao
    #[serde(
        rename = "hardhat_setPrevRandao",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetPrevRandao(ZeroXPrefixedBytes),
    /// hardhat_setStorageAt
    #[serde(rename = "hardhat_setStorageAt")]
    SetStorageAt(Address, U256, ZeroXPrefixedBytes),
    /// hardhat_stopImpersonatingAccount
    #[serde(
        rename = "hardhat_stopImpersonatingAccount",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    StopImpersonatingAccount(Address),
}

/// for use with hardhat_reset
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct RpcHardhatNetworkConfig {
    forking: Option<RpcForkConfig>,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct RpcForkConfig {
    json_rpc_url: String,
    block_number: Option<usize>,
    http_headers: Option<HashMap<String, String>>,
}

#[cfg(test)]
mod tests {
    use bytes::Bytes;

    use super::*;
    use crate::remote::methods::MethodInvocation;

    fn help_test_method_invocation_serde(call: MethodInvocation) {
        let json = serde_json::json!(call).to_string();

        #[derive(Debug, serde::Deserialize)]
        struct MethodInvocationStructWithUntypedParams {
            #[allow(dead_code)]
            method: String,
            #[allow(dead_code)]
            params: Vec<serde_json::Value>,
        }
        #[derive(Debug, serde::Deserialize)]
        #[serde(untagged)]
        enum MethodInvocationEnumWithUntypedParams {
            Eth(MethodInvocationStructWithUntypedParams),
            Hardhat(MethodInvocationStructWithUntypedParams),
        }
        serde_json::from_str::<MethodInvocationEnumWithUntypedParams>(&json).unwrap_or_else(|_| {
            panic!(
                "should have successfully deserialized, with params as a Vec<String>, json {json}"
            )
        });

        let call_decoded: MethodInvocation = serde_json::from_str(&json)
            .unwrap_or_else(|_| panic!("should have successfully deserialized json {json}"));
        assert_eq!(call, call_decoded);
    }

    #[test]
    fn test_serde_hardhat_add_compilation_result() {
        // these were taken from a run of TypeScript function compileLiteral
        let compiler_input_json = r#"{
            "language": "Solidity",
            "sources": {
                "literal.sol": {
                    "content": "\n            contract Nine {\n                function returnNine() public pure returns (int) { return 9; }\n            }\n          "
                }
            },
            "settings": {
                "optimizer": {
                    "enabled": false
                },
                "outputSelection": {
                    "*": {
                        "*": [
                            "abi",
                            "evm.bytecode",
                            "evm.deployedBytecode",
                            "evm.methodIdentifiers"
                        ],
                        "": [
                            "id",
                            "ast"
                        ]
                    }
                }
            }
        }"#;
        let compiler_output_json = r##"{
            "contracts": {
                "literal.sol": {
                    "Nine": {
                        "abi": [
                            {
                                "inputs": [],
                                "name": "returnNine",
                                "outputs": [
                                    {
                                        "internalType": "int256",
                                        "name": "",
                                        "type": "int256"
                                    }
                                ],
                                "stateMutability": "pure",
                                "type": "function"
                            }
                        ],
                        "evm": {
                            "bytecode": {
                                "generatedSources": [],
                                "linkReferences": {},
                                "object": "608060405234801561001057600080fd5b5060b68061001f6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063df78ca5114602d575b600080fd5b60336047565b604051603e9190605d565b60405180910390f35b60006009905090565b6057816076565b82525050565b6000602082019050607060008301846050565b92915050565b600081905091905056fea2646970667358221220e7cab788146024c85c2e10b3c4e75886f12897ba5cbb11977003230b6e9f4bbd64736f6c63430008000033",
                                "opcodes": "PUSH1 0x80 PUSH1 0x40 MSTORE CALLVALUE DUP1 ISZERO PUSH2 0x10 JUMPI PUSH1 0x0 DUP1 REVERT JUMPDEST POP PUSH1 0xB6 DUP1 PUSH2 0x1F PUSH1 0x0 CODECOPY PUSH1 0x0 RETURN INVALID PUSH1 0x80 PUSH1 0x40 MSTORE CALLVALUE DUP1 ISZERO PUSH1 0xF JUMPI PUSH1 0x0 DUP1 REVERT JUMPDEST POP PUSH1 0x4 CALLDATASIZE LT PUSH1 0x28 JUMPI PUSH1 0x0 CALLDATALOAD PUSH1 0xE0 SHR DUP1 PUSH4 0xDF78CA51 EQ PUSH1 0x2D JUMPI JUMPDEST PUSH1 0x0 DUP1 REVERT JUMPDEST PUSH1 0x33 PUSH1 0x47 JUMP JUMPDEST PUSH1 0x40 MLOAD PUSH1 0x3E SWAP2 SWAP1 PUSH1 0x5D JUMP JUMPDEST PUSH1 0x40 MLOAD DUP1 SWAP2 SUB SWAP1 RETURN JUMPDEST PUSH1 0x0 PUSH1 0x9 SWAP1 POP SWAP1 JUMP JUMPDEST PUSH1 0x57 DUP2 PUSH1 0x76 JUMP JUMPDEST DUP3 MSTORE POP POP JUMP JUMPDEST PUSH1 0x0 PUSH1 0x20 DUP3 ADD SWAP1 POP PUSH1 0x70 PUSH1 0x0 DUP4 ADD DUP5 PUSH1 0x50 JUMP JUMPDEST SWAP3 SWAP2 POP POP JUMP JUMPDEST PUSH1 0x0 DUP2 SWAP1 POP SWAP2 SWAP1 POP JUMP INVALID LOG2 PUSH5 0x6970667358 0x22 SLT KECCAK256 0xE7 0xCA 0xB7 DUP9 EQ PUSH1 0x24 0xC8 0x5C 0x2E LT 0xB3 0xC4 0xE7 PC DUP7 CALL 0x28 SWAP8 0xBA 0x5C 0xBB GT SWAP8 PUSH17 0x3230B6E9F4BBD64736F6C634300080000 CALLER ",
                                "sourceMap": "13:107:0:-:0;;;;;;;;;;;;;;;;;;;"
                            },
                            "deployedBytecode": {
                                "generatedSources": [
                                    {
                                        "ast": {
                                            "nodeType": "YulBlock",
                                            "src": "0:431:1",
                                            "statements": [
                                                {
                                                    "body": {
                                                        "nodeType": "YulBlock",
                                                        "src": "70:52:1",
                                                        "statements": [
                                                            {
                                                                "expression": {
                                                                    "arguments": [
                                                                        {
                                                                            "name": "pos",
                                                                            "nodeType": "YulIdentifier",
                                                                            "src": "87:3:1"
                                                                        },
                                                                        {
                                                                            "arguments": [
                                                                                {
                                                                                    "name": "value",
                                                                                    "nodeType": "YulIdentifier",
                                                                                    "src": "109:5:1"
                                                                                }
                                                                            ],
                                                                            "functionName": {
                                                                                "name": "cleanup_t_int256",
                                                                                "nodeType": "YulIdentifier",
                                                                                "src": "92:16:1"
                                                                            },
                                                                            "nodeType": "YulFunctionCall",
                                                                            "src": "92:23:1"
                                                                        }
                                                                    ],
                                                                    "functionName": {
                                                                        "name": "mstore",
                                                                        "nodeType": "YulIdentifier",
                                                                        "src": "80:6:1"
                                                                    },
                                                                    "nodeType": "YulFunctionCall",
                                                                    "src": "80:36:1"
                                                                },
                                                                "nodeType": "YulExpressionStatement",
                                                                "src": "80:36:1"
                                                            }
                                                        ]
                                                    },
                                                    "name": "abi_encode_t_int256_to_t_int256_fromStack",
                                                    "nodeType": "YulFunctionDefinition",
                                                    "parameters": [
                                                        {
                                                            "name": "value",
                                                            "nodeType": "YulTypedName",
                                                            "src": "58:5:1",
                                                            "type": ""
                                                        },
                                                        {
                                                            "name": "pos",
                                                            "nodeType": "YulTypedName",
                                                            "src": "65:3:1",
                                                            "type": ""
                                                        }
                                                    ],
                                                    "src": "7:115:1"
                                                },
                                                {
                                                    "body": {
                                                        "nodeType": "YulBlock",
                                                        "src": "224:122:1",
                                                        "statements": [
                                                            {
                                                                "nodeType": "YulAssignment",
                                                                "src": "234:26:1",
                                                                "value": {
                                                                    "arguments": [
                                                                        {
                                                                            "name": "headStart",
                                                                            "nodeType": "YulIdentifier",
                                                                            "src": "246:9:1"
                                                                        },
                                                                        {
                                                                            "kind": "number",
                                                                            "nodeType": "YulLiteral",
                                                                            "src": "257:2:1",
                                                                            "type": "",
                                                                            "value": "32"
                                                                        }
                                                                    ],
                                                                    "functionName": {
                                                                        "name": "add",
                                                                        "nodeType": "YulIdentifier",
                                                                        "src": "242:3:1"
                                                                    },
                                                                    "nodeType": "YulFunctionCall",
                                                                    "src": "242:18:1"
                                                                },
                                                                "variableNames": [
                                                                    {
                                                                        "name": "tail",
                                                                        "nodeType": "YulIdentifier",
                                                                        "src": "234:4:1"
                                                                    }
                                                                ]
                                                            },
                                                            {
                                                                "expression": {
                                                                    "arguments": [
                                                                        {
                                                                            "name": "value0",
                                                                            "nodeType": "YulIdentifier",
                                                                            "src": "312:6:1"
                                                                        },
                                                                        {
                                                                            "arguments": [
                                                                                {
                                                                                    "name": "headStart",
                                                                                    "nodeType": "YulIdentifier",
                                                                                    "src": "325:9:1"
                                                                                },
                                                                                {
                                                                                    "kind": "number",
                                                                                    "nodeType": "YulLiteral",
                                                                                    "src": "336:1:1",
                                                                                    "type": "",
                                                                                    "value": "0"
                                                                                }
                                                                            ],
                                                                            "functionName": {
                                                                                "name": "add",
                                                                                "nodeType": "YulIdentifier",
                                                                                "src": "321:3:1"
                                                                            },
                                                                            "nodeType": "YulFunctionCall",
                                                                            "src": "321:17:1"
                                                                        }
                                                                    ],
                                                                    "functionName": {
                                                                        "name": "abi_encode_t_int256_to_t_int256_fromStack",
                                                                        "nodeType": "YulIdentifier",
                                                                        "src": "270:41:1"
                                                                    },
                                                                    "nodeType": "YulFunctionCall",
                                                                    "src": "270:69:1"
                                                                },
                                                                "nodeType": "YulExpressionStatement",
                                                                "src": "270:69:1"
                                                            }
                                                        ]
                                                    },
                                                    "name": "abi_encode_tuple_t_int256__to_t_int256__fromStack_reversed",
                                                    "nodeType": "YulFunctionDefinition",
                                                    "parameters": [
                                                        {
                                                            "name": "headStart",
                                                            "nodeType": "YulTypedName",
                                                            "src": "196:9:1",
                                                            "type": ""
                                                        },
                                                        {
                                                            "name": "value0",
                                                            "nodeType": "YulTypedName",
                                                            "src": "208:6:1",
                                                            "type": ""
                                                        }
                                                    ],
                                                    "returnVariables": [
                                                        {
                                                            "name": "tail",
                                                            "nodeType": "YulTypedName",
                                                            "src": "219:4:1",
                                                            "type": ""
                                                        }
                                                    ],
                                                    "src": "128:218:1"
                                                },
                                                {
                                                    "body": {
                                                        "nodeType": "YulBlock",
                                                        "src": "396:32:1",
                                                        "statements": [
                                                            {
                                                                "nodeType": "YulAssignment",
                                                                "src": "406:16:1",
                                                                "value": {
                                                                    "name": "value",
                                                                    "nodeType": "YulIdentifier",
                                                                    "src": "417:5:1"
                                                                },
                                                                "variableNames": [
                                                                    {
                                                                        "name": "cleaned",
                                                                        "nodeType": "YulIdentifier",
                                                                        "src": "406:7:1"
                                                                    }
                                                                ]
                                                            }
                                                        ]
                                                    },
                                                    "name": "cleanup_t_int256",
                                                    "nodeType": "YulFunctionDefinition",
                                                    "parameters": [
                                                        {
                                                            "name": "value",
                                                            "nodeType": "YulTypedName",
                                                            "src": "378:5:1",
                                                            "type": ""
                                                        }
                                                    ],
                                                    "returnVariables": [
                                                        {
                                                            "name": "cleaned",
                                                            "nodeType": "YulTypedName",
                                                            "src": "388:7:1",
                                                            "type": ""
                                                        }
                                                    ],
                                                    "src": "352:76:1"
                                                }
                                            ]
                                        },
                                        "contents": "{\n\n    function abi_encode_t_int256_to_t_int256_fromStack(value, pos) {\n        mstore(pos, cleanup_t_int256(value))\n    }\n\n    function abi_encode_tuple_t_int256__to_t_int256__fromStack_reversed(headStart , value0) -> tail {\n        tail := add(headStart, 32)\n\n        abi_encode_t_int256_to_t_int256_fromStack(value0,  add(headStart, 0))\n\n    }\n\n    function cleanup_t_int256(value) -> cleaned {\n        cleaned := value\n    }\n\n}\n",
                                        "id": 1,
                                        "language": "Yul",
                                        "name": "#utility.yul"
                                    }
                                ],
                                "immutableReferences": {},
                                "linkReferences": {},
                                "object": "6080604052348015600f57600080fd5b506004361060285760003560e01c8063df78ca5114602d575b600080fd5b60336047565b604051603e9190605d565b60405180910390f35b60006009905090565b6057816076565b82525050565b6000602082019050607060008301846050565b92915050565b600081905091905056fea2646970667358221220e7cab788146024c85c2e10b3c4e75886f12897ba5cbb11977003230b6e9f4bbd64736f6c63430008000033",
                                "opcodes": "PUSH1 0x80 PUSH1 0x40 MSTORE CALLVALUE DUP1 ISZERO PUSH1 0xF JUMPI PUSH1 0x0 DUP1 REVERT JUMPDEST POP PUSH1 0x4 CALLDATASIZE LT PUSH1 0x28 JUMPI PUSH1 0x0 CALLDATALOAD PUSH1 0xE0 SHR DUP1 PUSH4 0xDF78CA51 EQ PUSH1 0x2D JUMPI JUMPDEST PUSH1 0x0 DUP1 REVERT JUMPDEST PUSH1 0x33 PUSH1 0x47 JUMP JUMPDEST PUSH1 0x40 MLOAD PUSH1 0x3E SWAP2 SWAP1 PUSH1 0x5D JUMP JUMPDEST PUSH1 0x40 MLOAD DUP1 SWAP2 SUB SWAP1 RETURN JUMPDEST PUSH1 0x0 PUSH1 0x9 SWAP1 POP SWAP1 JUMP JUMPDEST PUSH1 0x57 DUP2 PUSH1 0x76 JUMP JUMPDEST DUP3 MSTORE POP POP JUMP JUMPDEST PUSH1 0x0 PUSH1 0x20 DUP3 ADD SWAP1 POP PUSH1 0x70 PUSH1 0x0 DUP4 ADD DUP5 PUSH1 0x50 JUMP JUMPDEST SWAP3 SWAP2 POP POP JUMP JUMPDEST PUSH1 0x0 DUP2 SWAP1 POP SWAP2 SWAP1 POP JUMP INVALID LOG2 PUSH5 0x6970667358 0x22 SLT KECCAK256 0xE7 0xCA 0xB7 DUP9 EQ PUSH1 0x24 0xC8 0x5C 0x2E LT 0xB3 0xC4 0xE7 PC DUP7 CALL 0x28 SWAP8 0xBA 0x5C 0xBB GT SWAP8 PUSH17 0x3230B6E9F4BBD64736F6C634300080000 CALLER ",
                                "sourceMap": "13:107:0:-:0;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;45:61;;;:::i;:::-;;;;;;;:::i;:::-;;;;;;;;;88:3;102:1;95:8;;45:61;:::o;7:115:1:-;92:23;109:5;92:23;:::i;:::-;87:3;80:36;70:52;;:::o;128:218::-;;257:2;246:9;242:18;234:26;;270:69;336:1;325:9;321:17;312:6;270:69;:::i;:::-;224:122;;;;:::o;352:76::-;;417:5;406:16;;396:32;;;:::o"
                            },
                            "methodIdentifiers": {
                                "returnNine()": "df78ca51"
                            }
                        }
                    }
                }
            },
            "errors": [
                {
                    "component": "general",
                    "errorCode": "1878",
                    "formattedMessage": "Warning: SPDX license identifier not provided in source file. Before publishing, consider adding a comment containing \"SPDX-License-Identifier: <SPDX-License>\" to each source file. Use \"SPDX-License-Identifier: UNLICENSED\" for non-open-source code. Please see https://spdx.org for more information.\n--> literal.sol\n\n",
                    "message": "SPDX license identifier not provided in source file. Before publishing, consider adding a comment containing \"SPDX-License-Identifier: <SPDX-License>\" to each source file. Use \"SPDX-License-Identifier: UNLICENSED\" for non-open-source code. Please see https://spdx.org for more information.",
                    "severity": "warning",
                    "sourceLocation": {
                        "end": -1,
                        "file": "literal.sol",
                        "start": -1
                    },
                    "type": "Warning"
                },
                {
                    "component": "general",
                    "errorCode": "3420",
                    "formattedMessage": "Warning: Source file does not specify required compiler version! Consider adding \"pragma solidity ^0.8.0;\"\n--> literal.sol\n\n",
                    "message": "Source file does not specify required compiler version! Consider adding \"pragma solidity ^0.8.0;\"",
                    "severity": "warning",
                    "sourceLocation": {
                        "end": -1,
                        "file": "literal.sol",
                        "start": -1
                    },
                    "type": "Warning"
                }
            ],
            "sources": {
                "literal.sol": {
                    "ast": {
                        "absolutePath": "literal.sol",
                        "exportedSymbols": {
                            "Nine": [
                                9
                            ]
                        },
                        "id": 10,
                        "nodeType": "SourceUnit",
                        "nodes": [
                            {
                                "abstract": false,
                                "baseContracts": [],
                                "contractDependencies": [],
                                "contractKind": "contract",
                                "fullyImplemented": true,
                                "id": 9,
                                "linearizedBaseContracts": [
                                    9
                                ],
                                "name": "Nine",
                                "nodeType": "ContractDefinition",
                                "nodes": [
                                    {
                                        "body": {
                                            "id": 7,
                                            "nodeType": "Block",
                                            "src": "93:13:0",
                                            "statements": [
                                                {
                                                    "expression": {
                                                        "hexValue": "39",
                                                        "id": 5,
                                                        "isConstant": false,
                                                        "isLValue": false,
                                                        "isPure": true,
                                                        "kind": "number",
                                                        "lValueRequested": false,
                                                        "nodeType": "Literal",
                                                        "src": "102:1:0",
                                                        "typeDescriptions": {
                                                            "typeIdentifier": "t_rational_9_by_1",
                                                            "typeString": "int_const 9"
                                                        },
                                                        "value": "9"
                                                    },
                                                    "functionReturnParameters": 4,
                                                    "id": 6,
                                                    "nodeType": "Return",
                                                    "src": "95:8:0"
                                                }
                                            ]
                                        },
                                        "functionSelector": "df78ca51",
                                        "id": 8,
                                        "implemented": true,
                                        "kind": "function",
                                        "modifiers": [],
                                        "name": "returnNine",
                                        "nodeType": "FunctionDefinition",
                                        "parameters": {
                                            "id": 1,
                                            "nodeType": "ParameterList",
                                            "parameters": [],
                                            "src": "64:2:0"
                                        },
                                        "returnParameters": {
                                            "id": 4,
                                            "nodeType": "ParameterList",
                                            "parameters": [
                                                {
                                                    "constant": false,
                                                    "id": 3,
                                                    "mutability": "mutable",
                                                    "name": "",
                                                    "nodeType": "VariableDeclaration",
                                                    "scope": 8,
                                                    "src": "88:3:0",
                                                    "stateVariable": false,
                                                    "storageLocation": "default",
                                                    "typeDescriptions": {
                                                        "typeIdentifier": "t_int256",
                                                        "typeString": "int256"
                                                    },
                                                    "typeName": {
                                                        "id": 2,
                                                        "name": "int",
                                                        "nodeType": "ElementaryTypeName",
                                                        "src": "88:3:0",
                                                        "typeDescriptions": {
                                                            "typeIdentifier": "t_int256",
                                                            "typeString": "int256"
                                                        }
                                                    },
                                                    "visibility": "internal"
                                                }
                                            ],
                                            "src": "87:5:0"
                                        },
                                        "scope": 9,
                                        "src": "45:61:0",
                                        "stateMutability": "pure",
                                        "virtual": false,
                                        "visibility": "public"
                                    }
                                ],
                                "scope": 10,
                                "src": "13:107:0"
                            }
                        ],
                        "src": "13:118:0"
                    },
                    "id": 0
                }
            }
        }"##;

        let call = MethodInvocation::Hardhat(HardhatMethodInvocation::AddCompilationResult(
            String::from("0.8.0"),
            serde_json::from_str::<compiler_io::CompilerInput>(compiler_input_json).unwrap(),
            serde_json::from_str::<compiler_io::CompilerOutput>(compiler_output_json).unwrap(),
        ));

        help_test_method_invocation_serde(call.clone());

        match call {
            MethodInvocation::Hardhat(hardhat_method_invocation) => {
                match hardhat_method_invocation {
                    HardhatMethodInvocation::AddCompilationResult(_, ref input, ref output) => {
                        assert_eq!(
                            serde_json::to_value(input).unwrap(),
                            serde_json::to_value(
                                serde_json::from_str::<compiler_io::CompilerInput>(
                                    compiler_input_json
                                )
                                .unwrap()
                            )
                            .unwrap(),
                        );
                        assert_eq!(
                            serde_json::to_value(output).unwrap(),
                            serde_json::to_value(
                                serde_json::from_str::<compiler_io::CompilerOutput>(
                                    compiler_output_json
                                )
                                .unwrap()
                            )
                            .unwrap(),
                        );
                    }
                    _ => panic!("method invocation should have been AddCompilationResult"),
                };
            }
            _ => panic!("call should have been a hardhat method invocation"),
        }
    }

    #[test]
    fn test_serde_hardhat_drop_transaction() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::DropTransaction(B256::from_low_u64_ne(1)),
        ));
    }

    #[test]
    fn test_serde_hardhat_get_automine() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::GetAutomine(),
        ));
    }

    #[test]
    fn test_serde_hardhat_get_stack_trace_failures_count() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::GetStackTraceFailuresCount(),
        ));
    }

    #[test]
    fn test_serde_hardhat_impersonate_account() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::ImpersonateAccount(Address::from_low_u64_ne(1)),
        ));
    }

    #[test]
    fn test_serde_hardhat_interval_mine() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::IntervalMine(),
        ));
    }

    #[test]
    fn test_serde_hardhat_metadata() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::Metadata(),
        ));
    }

    #[test]
    fn test_serde_hardhat_mine() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::Mine(U256::from(1), U256::from(1)),
        ));
    }

    #[test]
    fn test_serde_hardhat_reset() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::Reset(Some(RpcHardhatNetworkConfig {
                forking: Some(RpcForkConfig {
                    json_rpc_url: String::from("http://whatever.com/whatever"),
                    block_number: Some(123456),
                    http_headers: None,
                }),
            })),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_balance() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::SetBalance(Address::from_low_u64_ne(1), U256::ZERO),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_code() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::SetCode(
                Address::from_low_u64_ne(1),
                Bytes::from(&b"whatever"[..]).into(),
            ),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_coinbase() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::SetCoinbase(Address::from_low_u64_ne(1)),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_logging_enabled() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::SetLoggingEnabled(true),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_min_gas_price() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::SetMinGasPrice(U256::from(1)),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_next_block_base_fee_per_gas() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::SetNextBlockBaseFeePerGas(U256::from(1)),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_nonce() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::SetNonce(Address::from_low_u64_ne(1), U256::from(1)),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_prev_randao() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::SetPrevRandao(Bytes::from(&b"whatever"[..]).into()),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_storage_at() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::SetStorageAt(
                Address::from_low_u64_ne(1),
                U256::ZERO,
                Bytes::from(&b"whatever"[..]).into(),
            ),
        ));
    }

    #[test]
    fn test_serde_hardhat_stop_impersonating_account() {
        help_test_method_invocation_serde(MethodInvocation::Hardhat(
            HardhatMethodInvocation::StopImpersonatingAccount(Address::from_low_u64_ne(1)),
        ));
    }
}
