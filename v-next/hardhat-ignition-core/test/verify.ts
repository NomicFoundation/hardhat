import { assert } from "chai";
import path from "path";

import {
  BuildInfo,
  VerifyResult,
  getVerificationInformation,
} from "../src/index.js";
import { getImportSourceNames } from "../src/verify.js";

describe("verify", () => {
  it("should not verify an unitialized deployment", async () => {
    await assert.isRejected(
      getVerificationInformation("test").next(),
      /IGN1000: Cannot verify contracts for nonexistant deployment at test/,
    );
  });

  it("should not verify a deployment that did not deploy any contracts", async () => {
    const deploymentDir = path.join(
      __dirname,
      "mocks",
      "verify",
      "no-contracts",
    );

    await assert.isRejected(
      getVerificationInformation(deploymentDir).next(),
      /IGN1001: Cannot verify deployment/,
    );
  });

  it("should not verify a deployment deployed to an unsupported chain", async () => {
    const deploymentDir = path.join(
      __dirname,
      "mocks",
      "verify",
      "unsupported-chain",
    );

    await assert.isRejected(
      getVerificationInformation(deploymentDir).next(),
      /IGN1002: Verification not natively supported for chainId 123456789\. Please use a custom chain configuration to add support\./,
    );
  });

  it("should yield a verify result", async () => {
    const expectedResult: VerifyResult = [
      {
        network: "mainnet",
        chainId: 1,
        urls: {
          apiURL: "https://api.etherscan.io/api",
          browserURL: "https://etherscan.io",
        },
      },
      {
        address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        compilerVersion: "v0.8.19+commit.7dd6d404",
        sourceCode: `{"language":"Solidity","sources":{"contracts/Lock.sol":{"content":"// SPDX-License-Identifier: UNLICENSED\\npragma solidity ^0.8.9;\\n\\n// Uncomment this line to use console.log\\n// import \\"hardhat/console.sol\\";\\n\\ncontract Lock {\\n  uint public unlockTime;\\n  address payable public owner;\\n\\n  event Withdrawal(uint amount, uint when);\\n\\n  constructor(uint _unlockTime) payable {\\n    require(\\n      block.timestamp < _unlockTime,\\n      \\"Unlock time should be in the future\\"\\n    );\\n\\n    unlockTime = _unlockTime;\\n    owner = payable(msg.sender);\\n  }\\n\\n  function withdraw() public {\\n    // Uncomment this line, and the import of \\"hardhat/console.sol\\", to print a log in your terminal\\n    // console.log(\\"Unlock time is %o and block timestamp is %o\\", unlockTime, block.timestamp);\\n\\n    require(block.timestamp >= unlockTime, \\"You can't withdraw yet\\");\\n    require(msg.sender == owner, \\"You aren't the owner\\");\\n\\n    emit Withdrawal(address(this).balance, block.timestamp);\\n\\n    owner.transfer(address(this).balance);\\n  }\\n}\\n"}},"settings":{"optimizer":{"enabled":false,"runs":200},"outputSelection":{"*":{"*":["abi","evm.bytecode","evm.deployedBytecode","evm.methodIdentifiers","metadata"],"":["ast"]}}}}`,
        name: "contracts/Lock.sol:Lock",
        args: "00000000000000000000000000000000000000000000000000000000767d1650",
      },
    ];

    const deploymentDir = path.join(__dirname, "mocks", "verify", "success");

    const result = (await getVerificationInformation(deploymentDir).next())
      .value;

    assert.deepEqual(result, expectedResult);
  });

  it("should yield a null verify result for a contract with external artifacts", async () => {
    const expectedResult1: VerifyResult = [null, "LockModule#Basic"];

    const expectedResult2: VerifyResult = [
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io",
        },
      },
      {
        address: "0x8f19334E79b16112E2D74E9Bc2246cB3cbA3cfaa",
        compilerVersion: "v0.8.19+commit.7dd6d404",
        sourceCode: `{"language":"Solidity","sources":{"contracts/Lock.sol":{"content":"// SPDX-License-Identifier: UNLICENSED\\npragma solidity ^0.8.9;\\n\\n// Uncomment this line to use console.log\\n// import \\"hardhat/console.sol\\";\\n\\ncontract Lock {\\n  uint public unlockTime;\\n  address payable public owner;\\n\\n  event Withdrawal(uint amount, uint when);\\n\\n  constructor(uint _unlockTime) payable {\\n    require(\\n      block.timestamp < _unlockTime,\\n      \\"Unlock time should be in the future\\"\\n    );\\n\\n    unlockTime = _unlockTime;\\n    owner = payable(msg.sender);\\n  }\\n\\n  function withdraw() public {\\n    // Uncomment this line, and the import of \\"hardhat/console.sol\\", to print a log in your terminal\\n    // console.log(\\"Unlock time is %o and block timestamp is %o\\", unlockTime, block.timestamp);\\n\\n    require(block.timestamp >= unlockTime, \\"You can't withdraw yet\\");\\n    require(msg.sender == owner, \\"You aren't the owner\\");\\n\\n    emit Withdrawal(address(this).balance, block.timestamp);\\n\\n    owner.transfer(address(this).balance);\\n  }\\n}\\n"}},"settings":{"optimizer":{"enabled":false,"runs":200},"outputSelection":{"*":{"*":["abi","evm.bytecode","evm.deployedBytecode","evm.methodIdentifiers","metadata"],"":["ast"]}}}}`,
        name: "contracts/Lock.sol:Lock",
        args: "00000000000000000000000000000000000000000000000000000000767d1650",
      },
    ];

    const deploymentDir = path.join(
      __dirname,
      "mocks",
      "verify",
      "external-artifacts",
    );

    const generator = getVerificationInformation(deploymentDir);

    const result1 = (await generator.next()).value;

    assert.deepEqual(result1, expectedResult1);

    const result2: VerifyResult = await (await generator.next()).value;

    assert.deepEqual(result2, expectedResult2);
  });

  it("should yield a verify result with a custom chain", async () => {
    const expectedResult: VerifyResult = [
      {
        network: "mainnet",
        chainId: 1,
        urls: {
          apiURL: "overridden",
          browserURL: "also overridden",
        },
      },
      {
        address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        compilerVersion: "v0.8.19+commit.7dd6d404",
        sourceCode: `{"language":"Solidity","sources":{"contracts/Lock.sol":{"content":"// SPDX-License-Identifier: UNLICENSED\\npragma solidity ^0.8.9;\\n\\n// Uncomment this line to use console.log\\n// import \\"hardhat/console.sol\\";\\n\\ncontract Lock {\\n  uint public unlockTime;\\n  address payable public owner;\\n\\n  event Withdrawal(uint amount, uint when);\\n\\n  constructor(uint _unlockTime) payable {\\n    require(\\n      block.timestamp < _unlockTime,\\n      \\"Unlock time should be in the future\\"\\n    );\\n\\n    unlockTime = _unlockTime;\\n    owner = payable(msg.sender);\\n  }\\n\\n  function withdraw() public {\\n    // Uncomment this line, and the import of \\"hardhat/console.sol\\", to print a log in your terminal\\n    // console.log(\\"Unlock time is %o and block timestamp is %o\\", unlockTime, block.timestamp);\\n\\n    require(block.timestamp >= unlockTime, \\"You can't withdraw yet\\");\\n    require(msg.sender == owner, \\"You aren't the owner\\");\\n\\n    emit Withdrawal(address(this).balance, block.timestamp);\\n\\n    owner.transfer(address(this).balance);\\n  }\\n}\\n"}},"settings":{"optimizer":{"enabled":false,"runs":200},"outputSelection":{"*":{"*":["abi","evm.bytecode","evm.deployedBytecode","evm.methodIdentifiers","metadata"],"":["ast"]}}}}`,
        name: "contracts/Lock.sol:Lock",
        args: "00000000000000000000000000000000000000000000000000000000767d1650",
      },
    ];

    const deploymentDir = path.join(__dirname, "mocks", "verify", "success");

    const result = (
      await getVerificationInformation(deploymentDir, [
        {
          network: "mainnet",
          chainId: 1,
          urls: {
            apiURL: "overridden",
            browserURL: "also overridden",
          },
        },
      ]).next()
    ).value;

    assert.deepEqual(result, expectedResult);
  });

  it("should yield a verify result for contract with libraries", async () => {
    const librariesResult = {
      "contracts/Lib.sol": {
        UUUUU: "0x0B014cb3B1AF9F45123195B37538Fb9dB6F5eF5F",
      },
    };

    const deploymentDir = path.join(__dirname, "mocks", "verify", "libraries");

    let success: boolean = false;
    for await (const [chainInfo, info] of getVerificationInformation(
      deploymentDir,
    )) {
      assert(chainInfo !== null);

      if (info.name === "contracts/Lock.sol:WAAIT") {
        const librariesOutput = JSON.parse(info.sourceCode).settings.libraries;

        assert.deepEqual(librariesOutput, librariesResult);
        success = true;
        break;
      }
    }

    assert.isTrue(success);
  });

  // The build info for the mock used in this test contains compilation info for "Lock.sol" as well,
  // which was not part of the deployment.
  // This test ensures that it is not included in the verification info, as well as that the other
  // contracts in the deployment are not sent if they are not needed for the requested contract.
  it("should yield a verify result containing only the requested contract", async () => {
    const expectedResultMap: { [k: string]: string[] } = {
      "contracts/TestA.sol:TestA": [
        "contracts/TestA.sol",
        "contracts/TestB.sol",
        "contracts/TestC.sol",
        "contracts/TestD.sol",
      ],
      "contracts/TestB.sol:TestB": [
        "contracts/TestB.sol",
        "contracts/TestC.sol",
        "contracts/TestD.sol",
      ],
      "contracts/TestC.sol:TestC": [
        "contracts/TestC.sol",
        "contracts/TestD.sol",
      ],
      "contracts/TestD.sol:TestD": ["contracts/TestD.sol"],
    };

    const deploymentDir = path.join(__dirname, "mocks", "verify", "min-input");

    for await (const [contractInfo, info] of getVerificationInformation(
      deploymentDir,
    )) {
      assert(contractInfo !== null);

      const expectedSources = expectedResultMap[info.name];
      const actualSources = Object.keys(JSON.parse(info.sourceCode).sources);

      assert.deepEqual(actualSources, expectedSources);
    }
  });

  it("should yield a verify result containing all available contracts when `includeUnrelatedContracts` is enabled", async () => {
    const expectedResultMap: { [k: string]: string[] } = {
      "contracts/TestA.sol:TestA": [
        "contracts/TestA.sol",
        "contracts/TestB.sol",
        "contracts/TestC.sol",
        "contracts/TestD.sol",
      ],
      "contracts/TestB.sol:TestB": [
        "contracts/TestA.sol",
        "contracts/TestB.sol",
        "contracts/TestC.sol",
        "contracts/TestD.sol",
      ],
      "contracts/TestC.sol:TestC": [
        "contracts/TestA.sol",
        "contracts/TestB.sol",
        "contracts/TestC.sol",
        "contracts/TestD.sol",
      ],
      "contracts/TestD.sol:TestD": [
        "contracts/TestA.sol",
        "contracts/TestB.sol",
        "contracts/TestC.sol",
        "contracts/TestD.sol",
      ],
    };

    const deploymentDir = path.join(__dirname, "mocks", "verify", "min-input");

    for await (const [contractInfo, info] of getVerificationInformation(
      deploymentDir,
      undefined,
      true,
    )) {
      assert(contractInfo !== null);

      const expectedSources = expectedResultMap[info.name];
      const actualSources = Object.keys(JSON.parse(info.sourceCode).sources);

      assert.deepEqual(actualSources, expectedSources);
    }
  });

  describe("getImportSourceNames", () => {
    const exampleBuildInfo: BuildInfo = {
      _format: "hh-sol-artifact-1",
      id: "example",
      solcVersion: "0.8.19",
      solcLongVersion: "0.8.19+commit.7dd6d404",
      input: {
        language: "Solidity",
        settings: {
          optimizer: {},
          outputSelection: {},
        },
        sources: {},
      },
      output: {
        contracts: {},
        sources: {},
      },
    };

    it("should handle circular imports", () => {
      const buildInfo: BuildInfo = {
        ...exampleBuildInfo,
        input: {
          ...exampleBuildInfo.input,
          sources: {
            "contracts/A.sol": {
              content: 'import "./B.sol";',
            },
            "contracts/B.sol": {
              content: 'import "./A.sol";',
            },
          },
        },
      };

      const result = getImportSourceNames("contracts/A.sol", buildInfo);

      assert.deepEqual(result, ["contracts/B.sol", "contracts/A.sol"]);
    });

    it("should handle indirect circular imports", () => {
      const buildInfo: BuildInfo = {
        ...exampleBuildInfo,
        input: {
          ...exampleBuildInfo.input,
          sources: {
            "contracts/A.sol": {
              content: 'import "./B.sol";',
            },
            "contracts/B.sol": {
              content: 'import "./C.sol";',
            },
            "contracts/C.sol": {
              content: 'import "./A.sol";',
            },
          },
        },
      };

      const result = getImportSourceNames("contracts/A.sol", buildInfo);

      assert.deepEqual(result, [
        "contracts/B.sol",
        "contracts/C.sol",
        "contracts/A.sol",
      ]);
    });
  });
});
