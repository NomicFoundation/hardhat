// This wrapper was created by extracting the parts of the solc-js package
// (https://github.com/ethereum/solc-js) that we need to perform compilation.

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import * as semver from "semver";

interface Solc {
  cwrap<T>(ident: string, returnType: string | null, argTypes: string[]): T;

  // eslint-disable-next-line @typescript-eslint/naming-convention -- this is a C function
  _solidity_reset?: Reset | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- this is a C function
  _solidity_version?: Version | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- this is a C function
  _version?: Version | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- this is a C function
  _compileStandard?: Compile | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- this is a C function
  _solidity_compile?: Compile | null;
}

type Reset = () => string;
type Version = () => string;
type Compile = (
  input: string,
  callbackPtr: number | null,
  callbackContextPtr?: null,
) => string;

export interface SolcWrapper {
  compile: CompileWrapper;
}

export type CompileWrapper = (input: string) => string;

export default function wrapper(solc: Solc): SolcWrapper {
  const version = bindVersion(solc);
  const semverVersion = versionToSemver(version());
  const isVersion6OrNewer = semver.gte(semverVersion, "0.6.0");
  const reset = bindReset(solc);
  const compile = bindCompile(solc, isVersion6OrNewer);

  if (compile === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY.INVALID_SOLCJS_COMPILER,
      {
        version: version(),
      },
    );
  }

  return {
    compile: compileWrapper(isVersion6OrNewer, compile, reset),
  };
}

function compileWrapper(
  isVersion6OrNewer: boolean,
  compile: Compile,
  reset?: Reset,
): CompileWrapper {
  return (input: string): string => {
    const output = isVersion6OrNewer
      ? compile(input, null, null)
      : compile(input, null);

    if (reset !== undefined) {
      // Explicitly free memory.
      //
      // NOTE: cwrap() of "compile" will copy the returned pointer into a
      //       Javascript string and it is not possible to call free() on it.
      //       reset() however will clear up all allocations.
      reset();
    }

    return output;
  };
}

function bindVersion(solc: Solc): Version {
  if (solc._solidity_version === null || solc._solidity_version === undefined) {
    return solc.cwrap("version", "string", []);
  }

  return solc.cwrap("solidity_version", "string", []);
}

function bindReset(solc: Solc): Reset | undefined {
  if (solc._solidity_reset === null || solc._solidity_reset === undefined) {
    return undefined;
  }

  return solc.cwrap("solidity_reset", null, []);
}

function bindCompile(
  solc: Solc,
  isVersion6OrNewer: boolean,
): CompileWrapper | undefined {
  if (isVersion6OrNewer) {
    if (
      solc._solidity_compile !== null &&
      solc._solidity_compile !== undefined
    ) {
      return solc.cwrap("solidity_compile", "string", [
        "string",
        "number",
        "number",
      ]);
    }
  } else {
    if (
      solc._solidity_compile !== null &&
      solc._solidity_compile !== undefined
    ) {
      return solc.cwrap("solidity_compile", "string", ["string", "number"]);
    }
    if (solc._compileStandard !== null && solc._compileStandard !== undefined) {
      return solc.cwrap("compileStandard", "string", ["string", "number"]);
    }
  }

  return undefined;
}

function versionToSemver(version: string): string {
  // FIXME: parse more detail, but this is a good start
  const parsed = version.match(
    /^([0-9]+\.[0-9]+\.[0-9]+)-([0-9a-f]{8})[/*].*$/,
  );
  if (parsed !== null) {
    return parsed[1] + "+commit." + parsed[2];
  }
  if (version.indexOf("0.1.3-0") !== -1) {
    return "0.1.3";
  }
  if (version.indexOf("0.3.5-0") !== -1) {
    return "0.3.5";
  }
  // assume it is already semver compatible
  return version;
}
