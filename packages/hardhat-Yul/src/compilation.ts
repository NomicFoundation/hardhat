import fsExtra from "fs-extra";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { Artifact, Artifacts, ProjectPathsConfig } from "hardhat/types";
import { localPathToSourceName } from "hardhat/utils/source-names";
import path from "path";
import solc = require('solc');
import yulp = require('yulp');
import * as fs from 'fs';
import { YulConfig } from "./types";
import { string } from "hardhat/internal/core/params/argumentTypes";


export async function compile(
  YulConfig: YulConfig,
  paths: ProjectPathsConfig,
  artifacts: Artifacts
) {
  const files = await getYulSources(paths);

  let someContractFailed = false;

  for (const file of files) {
    const pathFromCWD = path.relative(process.cwd(), file);
    const pathFromSources = path.relative(paths.sources, file);

    console.log("Compiling", pathFromCWD);

    let YulOutput = await compileYul(pathFromCWD, file)

    const sourceName = await localPathToSourceName(paths.root, file);
    const artifact = getArtifactFromYulOutput(sourceName, YulOutput);

    await artifacts.saveArtifactAndDebugFile(artifact);

  }
}


async function getYulSources(paths: ProjectPathsConfig) {
  const glob = await import("glob");
  const yulFiles = glob.sync(path.join(paths.sources, "**", "*.yul"));
  const yulpFiles = glob.sync(path.join(paths.sources, "**", "*.yulp"));

  return [...yulFiles, ...yulpFiles];
}

function pathToContractName(file: string) {
  const sourceName = path.basename(file);
  return sourceName.substring(0, sourceName.indexOf("."));
}

function getArtifactFromYulOutput(sourceName: string, output: any): Artifact {
  const contractName = pathToContractName(sourceName);

  return {
    _format: "hh-sol-artifact-1", // sig"function add()" makes this work
    contractName,
    sourceName,
    abi: output.abi,
    bytecode: output.bytecode,
    deployedBytecode: output.bytecode_runtime,
    linkReferences: {},
    deployedLinkReferences: {},
  };
}


async function handleCommonErrors<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    throw error;
  }
}

async function compileYul(filepath : string, filename : string) {
  const data = fs.readFileSync(filepath, 'utf8');
  const source = yulp.compile(data);
  let output = JSON.parse(solc.compile(JSON.stringify({
    "language": "Yul",
    "sources": { "Target.yul": { "content": yulp.print(source.results) } },
    "settings": {
      "outputSelection": { "*": { "*": ["*"], "": [ "*" ] } },
      "optimizer": {
        "enabled": true,
        "runs": 0,
        "details": {
          "yul": true
        }
      }
    }
  })));        
  let contractObjects = Object.keys(output.contracts["Target.yul"])
  let bytecode = "0x" + output.contracts["Target.yul"][contractObjects[0]]["evm"]["bytecode"]["object"];
  let abi = source.signatures.map(v => v.abi.slice(4, -1)).concat(source.topics.map(v => v.abi.slice(6, -1)))
  var contractCompiled = {
    "_format": "hh-sol-artifact-1",
    "sourceName" : filename,
    "abi" : abi,
    "bytecode" : bytecode,
    "linkReferences": {}, // I really don't know what this means
    "deployedLinkReferences": {} // This either
  }

  return contractCompiled;
}
