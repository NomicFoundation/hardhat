import {
  BuidlerConfig,
  RunTaskFunction,
  TruffleEnvironmentArtifactsType,
  TasksMap
} from "./types";
import { BuidlerArguments } from "./core/params/buidler-params";
import { BuidlerRuntimeEnvironment } from "./core/runtime-environment";

// This should declare all members of BuidlerRuntimeEnvironment as global
// variables, with the exception of injectToGlobal.

// This file shouldn't exist in the future, as these things should be
// require-able. Now they are used inside task definitions, that should probably
// be passed as an argument.

declare const env: BuidlerRuntimeEnvironment;
declare const Web3: any;
declare const pweb3: any;
declare const web3: any;
declare const config: BuidlerConfig;
declare const buidlerArguments: BuidlerArguments;
declare const artifacts: TruffleEnvironmentArtifactsType;
declare const run: RunTaskFunction;
declare const tasks: TasksMap;
