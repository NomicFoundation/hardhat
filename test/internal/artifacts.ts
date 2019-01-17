import * as assert from "assert";
import fsExtra from "fs-extra";
import * as os from "os";

import {
  getArtifactFromContractOutput,
  readArtifact,
  readArtifactSync,
  saveArtifact
} from "../../src/internal/artifacts";
import { ERRORS } from "../../src/internal/core/errors";
import { expectBuidlerError, expectBuidlerErrorAsync } from "../helpers/errors";

async function getEmptyTmpDir() {
  const tmpDir = os.tmpdir();
  const dir = tmpDir + "/buidler-tests-artifacts";
  await fsExtra.ensureDir(dir);
  await fsExtra.emptyDir(dir);

  return dir;
}

describe("Artifacts utils", () => {
  describe("getArtifactFromContractOutput", () => {
    it("Should always return a bytecode and linkReference", () => {
      const artifact = getArtifactFromContractOutput("Interface", {
        ...COMPILER_OUTPUTS.Interface,
        evm: undefined
      });

      assert.deepEqual(artifact, {
        contractName: "Interface",
        abi: COMPILER_OUTPUTS.Interface.abi,
        bytecode: "",
        linkReferences: {}
      });

      const artifact2 = getArtifactFromContractOutput("Interface", {
        ...COMPILER_OUTPUTS.Interface,
        evm: {}
      });

      assert.deepEqual(artifact2, {
        contractName: "Interface",
        abi: COMPILER_OUTPUTS.Interface.abi,
        bytecode: "",
        linkReferences: {}
      });

      const artifact3 = getArtifactFromContractOutput("Interface", {
        ...COMPILER_OUTPUTS.Interface,
        evm: { bytecode: {} }
      });

      assert.deepEqual(artifact3, {
        contractName: "Interface",
        abi: COMPILER_OUTPUTS.Interface.abi,
        bytecode: "",
        linkReferences: {}
      });
    });

    it("Should return the right artifact for an interface", () => {
      const artifact = getArtifactFromContractOutput(
        "Interface",
        COMPILER_OUTPUTS.Interface
      );

      assert.deepEqual(artifact, {
        contractName: "Interface",
        abi: COMPILER_OUTPUTS.Interface.abi,
        bytecode: "",
        linkReferences: {}
      });
    });

    it("Should return the right artifact for a library", () => {
      const artifact = getArtifactFromContractOutput(
        "Lib",
        COMPILER_OUTPUTS.Lib
      );

      assert.deepEqual(artifact, {
        contractName: "Lib",
        abi: COMPILER_OUTPUTS.Lib.abi,
        bytecode: COMPILER_OUTPUTS.Lib.evm.bytecode.object,
        linkReferences: {}
      });
    });

    it("Should return the right artifact for a contract without libs", () => {
      const artifact = getArtifactFromContractOutput(
        "WithBytecodeNoLibs",
        COMPILER_OUTPUTS.WithBytecodeNoLibs
      );

      assert.deepEqual(artifact, {
        contractName: "WithBytecodeNoLibs",
        abi: COMPILER_OUTPUTS.WithBytecodeNoLibs.abi,
        bytecode: COMPILER_OUTPUTS.WithBytecodeNoLibs.evm.bytecode.object,
        linkReferences: {}
      });
    });

    it("Should return the right artifact for a contract with libs", () => {
      const artifact = getArtifactFromContractOutput(
        "WithBytecodeAndLibs",
        COMPILER_OUTPUTS.WithBytecodeAndLibs
      );

      assert.deepEqual(artifact, {
        contractName: "WithBytecodeAndLibs",
        abi: COMPILER_OUTPUTS.WithBytecodeAndLibs.abi,
        bytecode: COMPILER_OUTPUTS.WithBytecodeAndLibs.evm.bytecode.object,
        linkReferences:
          COMPILER_OUTPUTS.WithBytecodeAndLibs.evm.bytecode.linkReferences
      });
    });

    it("Should return the right artifact for an abstract contract without libs", () => {
      const artifact = getArtifactFromContractOutput(
        "WithoutBytecodeNoLibs",
        COMPILER_OUTPUTS.WithoutBytecodeNoLibs
      );

      assert.deepEqual(artifact, {
        contractName: "WithoutBytecodeNoLibs",
        abi: COMPILER_OUTPUTS.WithoutBytecodeNoLibs.abi,
        bytecode: COMPILER_OUTPUTS.WithoutBytecodeNoLibs.evm.bytecode.object,
        linkReferences: {}
      });
    });

    it("Should return the right artifact for an abstract contract with libs", () => {
      const artifact = getArtifactFromContractOutput(
        "WithoutBytecodeWithLibs",
        COMPILER_OUTPUTS.WithoutBytecodeWithLibs
      );

      assert.deepEqual(artifact, {
        contractName: "WithoutBytecodeWithLibs",
        abi: COMPILER_OUTPUTS.WithoutBytecodeWithLibs.abi,
        bytecode: "",
        linkReferences:
          COMPILER_OUTPUTS.WithoutBytecodeWithLibs.evm.bytecode.linkReferences
      });
    });
  });

  describe("Artifacts reading and saving", () => {
    it("It should write and read (async) the right artifacts", async () => {
      const artifactsPath = await getEmptyTmpDir();

      for (const [name, output] of Object.entries(COMPILER_OUTPUTS)) {
        const artifact = getArtifactFromContractOutput(name, output);

        await saveArtifact(artifactsPath, artifact);
        const storedArtifact = await readArtifact(artifactsPath, name);

        assert.deepEqual(storedArtifact, artifact);
      }
    });

    it("It should write and read (sync) the right artifacts", async () => {
      const artifactsPath = await getEmptyTmpDir();

      for (const [name, output] of Object.entries(COMPILER_OUTPUTS)) {
        const artifact = getArtifactFromContractOutput(name, output);

        await saveArtifact(artifactsPath, artifact);
        const storedArtifact = readArtifactSync(artifactsPath, name);

        assert.deepEqual(storedArtifact, artifact);
      }
    });

    it("Should throw when reading a non-existent contract (async)", async () => {
      const artifactsPath = await getEmptyTmpDir();
      await expectBuidlerErrorAsync(
        () => readArtifact(artifactsPath, "NonExistent"),
        ERRORS.ARTIFACTS.NOT_FOUND
      );
    });

    it("Should throw when reading a non-existent contract (sync)", async () => {
      const artifactsPath = await getEmptyTmpDir();
      expectBuidlerError(
        () => readArtifactSync(artifactsPath, "NonExistent"),
        ERRORS.ARTIFACTS.NOT_FOUND
      );
    });
  });
});

const COMPILER_OUTPUTS = {
  Interface: {
    abi: [
      {
        constant: false,
        inputs: [],
        name: "abstractFunction",
        outputs: [
          {
            name: "",
            type: "uint256"
          }
        ],
        payable: false,
        stateMutability: "nonpayable",
        type: "function"
      }
    ],
    evm: {
      bytecode: {
        linkReferences: {},
        object: "",
        opcodes: "",
        sourceMap: ""
      }
    }
  },
  Lib: {
    abi: [
      {
        constant: true,
        inputs: [
          {
            name: "_v",
            type: "uint256"
          }
        ],
        name: "a",
        outputs: [
          {
            name: "",
            type: "uint256"
          }
        ],
        payable: false,
        stateMutability: "pure",
        type: "function"
      }
    ],
    evm: {
      bytecode: {
        linkReferences: {},
        object:
          "60cd61002f600b82828239805160001a6073146000811461001f57610021565bfe5b5030600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600436106050576000357c010000000000000000000000000000000000000000000000000000000090048063f0fdf834146055575b600080fd5b607e60048036036020811015606957600080fd5b81019080803590602001909291905050506094565b6040518082815260200191505060405180910390f35b600060018201905091905056fea165627a7a72305820a41f21f6acb16402773e617b7af23322ee8a67257edfe689db80e26fc133648e0029",
        opcodes:
          "PUSH1 0xCD PUSH2 0x2F PUSH1 0xB DUP3 DUP3 DUP3 CODECOPY DUP1 MLOAD PUSH1 0x0 BYTE PUSH1 0x73 EQ PUSH1 0x0 DUP2 EQ PUSH2 0x1F JUMPI PUSH2 0x21 JUMP JUMPDEST INVALID JUMPDEST POP ADDRESS PUSH1 0x0 MSTORE PUSH1 0x73 DUP2 MSTORE8 DUP3 DUP2 RETURN INVALID PUSH20 0x0 ADDRESS EQ PUSH1 0x80 PUSH1 0x40 MSTORE PUSH1 0x4 CALLDATASIZE LT PUSH1 0x50 JUMPI PUSH1 0x0 CALLDATALOAD PUSH29 0x100000000000000000000000000000000000000000000000000000000 SWAP1 DIV DUP1 PUSH4 0xF0FDF834 EQ PUSH1 0x55 JUMPI JUMPDEST PUSH1 0x0 DUP1 REVERT JUMPDEST PUSH1 0x7E PUSH1 0x4 DUP1 CALLDATASIZE SUB PUSH1 0x20 DUP2 LT ISZERO PUSH1 0x69 JUMPI PUSH1 0x0 DUP1 REVERT JUMPDEST DUP2 ADD SWAP1 DUP1 DUP1 CALLDATALOAD SWAP1 PUSH1 0x20 ADD SWAP1 SWAP3 SWAP2 SWAP1 POP POP POP PUSH1 0x94 JUMP JUMPDEST PUSH1 0x40 MLOAD DUP1 DUP3 DUP2 MSTORE PUSH1 0x20 ADD SWAP2 POP POP PUSH1 0x40 MLOAD DUP1 SWAP2 SUB SWAP1 RETURN JUMPDEST PUSH1 0x0 PUSH1 0x1 DUP3 ADD SWAP1 POP SWAP2 SWAP1 POP JUMP INVALID LOG1 PUSH6 0x627A7A723058 KECCAK256 LOG4 0x1f 0x21 0xf6 0xac 0xb1 PUSH5 0x2773E617B PUSH27 0xF23322EE8A67257EDFE689DB80E26FC133648E0029000000000000 ",
        sourceMap:
          "25:103:0:-;;132:2:-1;166:7;155:9;146:7;137:37;252:7;246:14;243:1;238:23;232:4;229:33;270:1;265:20;;;;222:63;;265:20;274:9;222:63;;298:9;295:1;288:20;328:4;319:7;311:22;352:7;343;336:24"
      }
    }
  },
  WithBytecodeAndLibs: {
    abi: [
      {
        constant: true,
        inputs: [
          {
            name: "_v",
            type: "uint256"
          }
        ],
        name: "b",
        outputs: [
          {
            name: "",
            type: "uint256"
          }
        ],
        payable: false,
        stateMutability: "pure",
        type: "function"
      }
    ],
    evm: {
      bytecode: {
        linkReferences: {
          "contracts/Greeter.sol": {
            Lib: [
              {
                length: 20,
                start: 179
              }
            ]
          }
        },
        object:
          "608060405234801561001057600080fd5b5061016a806100206000396000f3fe60806040526004361061003b576000357c010000000000000000000000000000000000000000000000000000000090048063cd580ff314610040575b600080fd5b34801561004c57600080fd5b506100796004803603602081101561006357600080fd5b810190808035906020019092919050505061008f565b6040518082815260200191505060405180910390f35b600073__$3baa23f5ca7f58d5ae3c2c5442fb05c7c2$__63f0fdf834836040518263ffffffff167c01000000000000000000000000000000000000000000000000000000000281526004018082815260200191505060206040518083038186803b1580156100fc57600080fd5b505af4158015610110573d6000803e3d6000fd5b505050506040513d602081101561012657600080fd5b8101908080519060200190929190505050905091905056fea165627a7a723058202f8f784cceecf0165b9ece17246235b575bec1a6ae4751e4aeb0a6b1bd1eb1340029",
        opcodes:
          "PUSH1 0x80 PUSH1 0x40 MSTORE CALLVALUE DUP1 ISZERO PUSH2 0x10 JUMPI PUSH1 0x0 DUP1 REVERT JUMPDEST POP PUSH2 0x16A DUP1 PUSH2 0x20 PUSH1 0x0 CODECOPY PUSH1 0x0 RETURN INVALID PUSH1 0x80 PUSH1 0x40 MSTORE PUSH1 0x4 CALLDATASIZE LT PUSH2 0x3B JUMPI PUSH1 0x0 CALLDATALOAD PUSH29 0x100000000000000000000000000000000000000000000000000000000 SWAP1 DIV DUP1 PUSH4 0xCD580FF3 EQ PUSH2 0x40 JUMPI JUMPDEST PUSH1 0x0 DUP1 REVERT JUMPDEST CALLVALUE DUP1 ISZERO PUSH2 0x4C JUMPI PUSH1 0x0 DUP1 REVERT JUMPDEST POP PUSH2 0x79 PUSH1 0x4 DUP1 CALLDATASIZE SUB PUSH1 0x20 DUP2 LT ISZERO PUSH2 0x63 JUMPI PUSH1 0x0 DUP1 REVERT JUMPDEST DUP2 ADD SWAP1 DUP1 DUP1 CALLDATALOAD SWAP1 PUSH1 0x20 ADD SWAP1 SWAP3 SWAP2 SWAP1 POP POP POP PUSH2 0x8F JUMP JUMPDEST PUSH1 0x40 MLOAD DUP1 DUP3 DUP2 MSTORE PUSH1 0x20 ADD SWAP2 POP POP PUSH1 0x40 MLOAD DUP1 SWAP2 SUB SWAP1 RETURN JUMPDEST PUSH1 0x0 PUSH20 0x0 PUSH4 0xF0FDF834 DUP4 PUSH1 0x40 MLOAD DUP3 PUSH4 0xFFFFFFFF AND PUSH29 0x100000000000000000000000000000000000000000000000000000000 MUL DUP2 MSTORE PUSH1 0x4 ADD DUP1 DUP3 DUP2 MSTORE PUSH1 0x20 ADD SWAP2 POP POP PUSH1 0x20 PUSH1 0x40 MLOAD DUP1 DUP4 SUB DUP2 DUP7 DUP1 EXTCODESIZE ISZERO DUP1 ISZERO PUSH2 0xFC JUMPI PUSH1 0x0 DUP1 REVERT JUMPDEST POP GAS DELEGATECALL ISZERO DUP1 ISZERO PUSH2 0x110 JUMPI RETURNDATASIZE PUSH1 0x0 DUP1 RETURNDATACOPY RETURNDATASIZE PUSH1 0x0 REVERT JUMPDEST POP POP POP POP PUSH1 0x40 MLOAD RETURNDATASIZE PUSH1 0x20 DUP2 LT ISZERO PUSH2 0x126 JUMPI PUSH1 0x0 DUP1 REVERT JUMPDEST DUP2 ADD SWAP1 DUP1 DUP1 MLOAD SWAP1 PUSH1 0x20 ADD SWAP1 SWAP3 SWAP2 SWAP1 POP POP POP SWAP1 POP SWAP2 SWAP1 POP JUMP INVALID LOG1 PUSH6 0x627A7A723058 KECCAK256 0x2f DUP16 PUSH25 0x4CCEECF0165B9ECE17246235B575BEC1A6AE4751E4AEB0A6B1 0xbd 0x1e 0xb1 CALLVALUE STOP 0x29 ",
        sourceMap:
          "342:123:0:-;;;;8:9:-1;5:2;;;30:1;27;20:12;5:2;342:123:0;;;;;;;"
      }
    }
  },
  WithBytecodeNoLibs: {
    abi: [],
    evm: {
      bytecode: {
        linkReferences: {},
        object:
          "6080604052348015600f57600080fd5b50603580601d6000396000f3fe6080604052600080fdfea165627a7a7230582007ac6029c1d58f4d28523d347bdf495350ea8691438d6bfcc5a7c88bf8d586c40029",
        opcodes:
          "PUSH1 0x80 PUSH1 0x40 MSTORE CALLVALUE DUP1 ISZERO PUSH1 0xF JUMPI PUSH1 0x0 DUP1 REVERT JUMPDEST POP PUSH1 0x35 DUP1 PUSH1 0x1D PUSH1 0x0 CODECOPY PUSH1 0x0 RETURN INVALID PUSH1 0x80 PUSH1 0x40 MSTORE PUSH1 0x0 DUP1 REVERT INVALID LOG1 PUSH6 0x627A7A723058 KECCAK256 SMOD 0xac PUSH1 0x29 0xc1 0xd5 DUP16 0x4d 0x28 MSTORE RETURNDATASIZE CALLVALUE PUSH28 0xDF495350EA8691438D6BFCC5A7C88BF8D586C4002900000000000000 ",
        sourceMap:
          "215:31:0:-;;;;8:9:-1;5:2;;;30:1;27;20:12;5:2;215:31:0;;;;;;;"
      }
    }
  },
  WithoutBytecodeWithLibs: {
    abi: [
      {
        constant: false,
        inputs: [],
        name: "abstractFunction",
        outputs: [
          {
            name: "",
            type: "uint256"
          }
        ],
        payable: false,
        stateMutability: "nonpayable",
        type: "function"
      },
      {
        constant: true,
        inputs: [
          {
            name: "_v",
            type: "uint256"
          }
        ],
        name: "b",
        outputs: [
          {
            name: "",
            type: "uint256"
          }
        ],
        payable: false,
        stateMutability: "pure",
        type: "function"
      }
    ],
    evm: {
      bytecode: {
        linkReferences: {},
        object: "",
        opcodes: "",
        sourceMap: ""
      }
    }
  },
  WithoutBytecodeNoLibs: {
    abi: [
      {
        constant: false,
        inputs: [],
        name: "abstractFunction",
        outputs: [
          {
            name: "",
            type: "uint256"
          }
        ],
        payable: false,
        stateMutability: "nonpayable",
        type: "function"
      }
    ],
    evm: {
      bytecode: {
        linkReferences: {},
        object: "",
        opcodes: "",
        sourceMap: ""
      }
    }
  }
};
