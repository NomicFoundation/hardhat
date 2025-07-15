import type { ParsedRootPath } from "../../../../../src/internal/builtin-plugins/solidity/build-system/root-paths-utils.js";
import type {
  ResolvedFile,
  ResolvedNpmPackage,
} from "../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatRootPath,
  isNpmParsedRootPath,
  isNpmRootPath,
  npmModuleToNpmRootPath,
  parseRootPath,
} from "../../../../../src/internal/builtin-plugins/solidity/build-system/root-paths-utils.js";
import { ResolvedFileType } from "../../../../../src/types/solidity.js";

interface TestRootPath {
  rootPath: string;
  parsedRootPath: ParsedRootPath;
  isNpm: boolean;
  npmModule?: string;
  userSourceName: string;
  resolvedFile: ResolvedFile;
}

const testHardhatProjectNpmPackage: ResolvedNpmPackage = {
  name: "hardhat-project",
  version: "1.2.3",
  rootFsPath: "/Users/root/",
  inputSourceNameRoot: "project",
};

const testRootPaths: TestRootPath[] = [
  {
    rootPath: "npm:ethers",
    parsedRootPath: {
      npmPath: "ethers",
    },
    isNpm: true,
    npmModule: "ethers",
    userSourceName: "ethers",
    resolvedFile: {
      type: ResolvedFileType.NPM_PACKAGE_FILE,
      inputSourceName: "ethers",
      fsPath: "/Users/root/node_modules/ethers/index.js",
      content: {
        text: "ethers",
        importPaths: [],
        versionPragmas: [],
      },
      package: {
        name: "ethers",
        version: "5.7.2",
        rootFsPath: "/Users/root/node_modules/ethers",
        inputSourceNameRoot: "ethers",
      },
    },
  },
  {
    rootPath: "npm:@openzeppelin/contracts",
    parsedRootPath: {
      npmPath: "@openzeppelin/contracts",
    },
    isNpm: true,
    npmModule: "@openzeppelin/contracts",
    userSourceName: "@openzeppelin/contracts",
    resolvedFile: {
      type: ResolvedFileType.NPM_PACKAGE_FILE,
      inputSourceName: "@openzeppelin/contracts",
      fsPath: "/Users/root/node_modules/@openzeppelin/contracts/index.js",
      content: {
        text: "@openzeppelin/contracts",
        importPaths: [],
        versionPragmas: [],
      },
      package: {
        name: "@openzeppelin/contracts",
        version: "5.7.2",
        rootFsPath: "/Users/root/node_modules/@openzeppelin/contracts",
        inputSourceNameRoot: "@openzeppelin/contracts",
      },
    },
  },
  {
    rootPath: "npm:@openzeppelin/contracts/token/ERC20/ERC20.sol",
    parsedRootPath: {
      npmPath: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
    },
    isNpm: true,
    npmModule: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
    userSourceName: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
    resolvedFile: {
      type: ResolvedFileType.NPM_PACKAGE_FILE,
      inputSourceName: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
      fsPath:
        "/Users/root/node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol",
      content: {
        text: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
        importPaths: [],
        versionPragmas: [],
      },
      package: {
        name: "@openzeppelin/contracts",
        version: "5.7.2",
        rootFsPath: "/Users/root/node_modules/@openzeppelin/contracts",
        inputSourceNameRoot: "@openzeppelin/contracts",
      },
    },
  },
  {
    rootPath: "/Users/root/contracts/Contract.sol",
    parsedRootPath: {
      fsPath: "/Users/root/contracts/Contract.sol",
    },
    isNpm: false,
    npmModule: undefined,
    userSourceName: "/Users/root/contracts/Contract.sol",
    resolvedFile: {
      type: ResolvedFileType.PROJECT_FILE,
      inputSourceName: "/Users/root/contracts/Contract.sol",
      fsPath: "/Users/root/contracts/Contract.sol",
      content: {
        text: "contract Contract {}",
        importPaths: [],
        versionPragmas: [],
      },
      package: testHardhatProjectNpmPackage,
    },
  },
  {
    rootPath: "C:\\Users\\root\\contracts\\Contract.sol",
    parsedRootPath: {
      fsPath: "C:\\Users\\root\\contracts\\Contract.sol",
    },
    isNpm: false,
    npmModule: undefined,
    userSourceName: "C:\\Users\\root\\contracts\\Contract.sol",
    resolvedFile: {
      type: ResolvedFileType.PROJECT_FILE,
      inputSourceName: "C:\\Users\\root\\contracts\\Contract.sol",
      fsPath: "C:\\Users\\root\\contracts\\Contract.sol",
      content: {
        text: "contract Contract {}",
        importPaths: [],
        versionPragmas: [],
      },
      package: testHardhatProjectNpmPackage,
    },
  },
];

describe("parseRootPath", () => {
  for (const { rootPath, parsedRootPath } of testRootPaths) {
    it(`should correctly parse root path ${rootPath}`, () => {
      assert.deepEqual(parseRootPath(rootPath), parsedRootPath);
    });
  }
});

describe("isNpmRootPath", () => {
  for (const { rootPath, isNpm } of testRootPaths) {
    it(`should correctly identify root path ${rootPath} as ${isNpm ? "npm" : "project file"} root path`, () => {
      assert.equal(isNpmRootPath(rootPath), isNpm);
    });
  }
});

describe("npmModuleToNpmRootPath", () => {
  for (const { npmModule, rootPath } of testRootPaths) {
    if (npmModule !== undefined) {
      it(`should correctly convert npm module ${npmModule} to npm root path`, () => {
        assert.equal(npmModuleToNpmRootPath(npmModule), rootPath);
      });
    }
  }
});

describe("isNpmParsedRootPath", () => {
  for (const { rootPath, parsedRootPath, isNpm } of testRootPaths) {
    it(`should correctly identify parsed root path ${rootPath} as ${isNpm ? "npm" : "project file"} root path`, () => {
      assert.equal(isNpmParsedRootPath(parsedRootPath), isNpm);
    });
  }
});

describe("formatRootPath", () => {
  for (const { rootPath, userSourceName, resolvedFile } of testRootPaths) {
    it(`should correctly format root path for ${userSourceName}`, () => {
      assert.equal(formatRootPath(userSourceName, resolvedFile), rootPath);
    });
  }
});
