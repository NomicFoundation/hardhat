import path from "path";
import semver from "semver";
import { beforeEach } from "node:test";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert, { AssertionError } from "node:assert";
import { BuildConfig, SolidityConfig } from "../src/internal/types/config.js";
import { SolcConfig } from "../src/internal/types/index.js";
import { ErrorDescriptor } from "../src/internal/errors/errors-list.js";
import { HardhatError } from "../src/internal/errors/errors.js";
import { ResolvedFile } from "../src/internal/solidity/resolver.js";

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

const DEFAULT_SOLC_VERSION = "0.7.3";

interface SolcUserConfig {
  version: string;
  settings?: any;
}

interface MultiSolcUserConfig {
  compilers: SolcUserConfig[];
  overrides?: Record<string, SolcUserConfig>;
}

// Note that the user config SolidityUserConfig is more complex than the resolved config SolidityConfig
type SolidityUserConfig = string | SolcUserConfig | MultiSolcUserConfig;

const defaultSolcOutputSelection = {
  "*": {
    "*": [
      "abi",
      "evm.bytecode",
      "evm.deployedBytecode",
      "evm.methodIdentifiers",
      "metadata",
    ],
    "": ["ast"],
  },
};
export function cleanFixtureProjectDir(fixtureProjectName: string) {
  const folderPath = path.join(
    _dirname,
    "fixture-projects",
    fixtureProjectName,
  );

  rmSync(path.join(folderPath, "artifacts"), { recursive: true, force: true });
  rmSync(path.join(folderPath, "cache"), { recursive: true, force: true });
}

export function useFixtureProject(fixtureProjectName: string) {
  beforeEach(async () => {
    process.chdir(path.join(_dirname, "fixture-projects", fixtureProjectName));

    // be sure that the fixture folder is clean
    cleanFixtureProjectDir(fixtureProjectName);
  });
}

/**
 * This functions resolves the hardhat config, setting its defaults and
 * normalizing its types if necessary.
 *
 * @param hardhatConfigFileName the name of the hardhat configuration file
 *
 * @returns the resolved config
 */
export async function resolveConfig(
  hardhatConfigFileName: string = "hardhat.config.js",
): Promise<BuildConfig> {
  const rootDir = process.cwd();
  const userConfig = await importCsjOrEsModule(
    `${rootDir}/${hardhatConfigFileName}`,
  );

  return {
    ...userConfig,
    paths: {
      root: rootDir,
      sources: `${rootDir}/contracts`,
      cache: `${rootDir}/cache`,
      artifacts: `${rootDir}/artifacts`,
    },
    solidity: resolveSolidityConfig(userConfig),
  };
}

export async function importCsjOrEsModule(filePath: string): Promise<any> {
  try {
    const imported = await import(filePath);
    return imported.default !== undefined ? imported.default : imported;
  } catch (e: any) {
    if (e.code === "ERR_REQUIRE_ESM") {
      throw new Error("Cannot find configuration file");
    }

    throw e;
  }
}

export function resolveSolidityConfig(userConfig: BuildConfig): SolidityConfig {
  const userSolidityConfig = userConfig.solidity ?? DEFAULT_SOLC_VERSION;

  const multiSolcConfig: MultiSolcUserConfig =
    normalizeSolidityConfig(userSolidityConfig);

  const overrides = multiSolcConfig.overrides ?? {};

  return {
    compilers: multiSolcConfig.compilers.map(resolveCompiler),
    overrides: fromEntries(
      Object.entries(overrides).map(([name, config]) => [
        name,
        resolveCompiler(config),
      ]),
    ),
  };
}

function resolveCompiler(compiler: SolcUserConfig): SolcConfig {
  const resolved: SolcConfig = {
    version: compiler.version,
    settings: compiler.settings ?? {},
  };

  if (semver.gte(resolved.version, "0.8.20")) {
    resolved.settings.evmVersion = compiler.settings?.evmVersion ?? "paris";
  }

  resolved.settings.optimizer = {
    enabled: false,
    runs: 200,
    ...resolved.settings.optimizer,
  };

  if (resolved.settings.outputSelection === undefined) {
    resolved.settings.outputSelection = {};
  }

  for (const [file, contractSelection] of Object.entries(
    defaultSolcOutputSelection,
  )) {
    if (resolved.settings.outputSelection[file] === undefined) {
      resolved.settings.outputSelection[file] = {};
    }

    for (const [contract, outputs] of Object.entries(contractSelection)) {
      if (resolved.settings.outputSelection[file][contract] === undefined) {
        resolved.settings.outputSelection[file][contract] = [];
      }

      for (const output of outputs) {
        const includesOutput: boolean =
          resolved.settings.outputSelection[file][contract].includes(output);

        if (!includesOutput) {
          resolved.settings.outputSelection[file][contract].push(output);
        }
      }
    }
  }

  return resolved;
}

function fromEntries<T = any>(entries: Array<[string, any]>): T {
  return Object.assign(
    {},
    ...entries.map(([name, value]) => ({
      [name]: value,
    })),
  );
}

function normalizeSolidityConfig(
  solidityConfig: SolidityUserConfig,
): MultiSolcUserConfig {
  if (typeof solidityConfig === "string") {
    return {
      compilers: [
        {
          version: solidityConfig,
        },
      ],
    };
  }

  if ("version" in solidityConfig) {
    return { compilers: [solidityConfig] };
  }

  return solidityConfig;
}

export async function expectHardhatErrorAsync(
  f: () => Promise<any>,
  errorDescriptor: ErrorDescriptor,
  errorMessage?: string | RegExp,
) {
  // We create the error here to capture the stack trace before the await.
  // This makes things easier, at least as long as we don't have async stack
  // traces. This may change in the near-ish future.
  const error = new AssertionError({
    message: `HardhatError number ${errorDescriptor.number} expected, but no Error was thrown`,
  });

  try {
    await f();
  } catch (err: unknown) {
    if (!(err instanceof HardhatError)) {
      assert.fail();
    }
    assert.equal(err.number, errorDescriptor.number);

    assert.equal(
      err.message.includes("%s"),
      false,
      "HardhatError has old-style format tag",
    );

    assert.equal(
      err.message.match(/%[a-zA-Z][a-zA-Z0-9]*%/),
      null,
      "HardhatError has an unreplaced variable tag",
    );

    if (errorMessage !== undefined) {
      if (typeof errorMessage === "string") {
        if (!err.message.includes(errorMessage)) {
          const notExactMatch = new AssertionError({
            message: `HardhatError was correct, but should have include "${errorMessage}" but got "`,
          });

          notExactMatch.message += `${err.message}`;
          throw notExactMatch;
        }
      } else {
        if (errorMessage.exec(err.message) === null) {
          const notRegexpMatch = new AssertionError({
            message: `HardhatError was correct, but should have matched regex ${errorMessage.toString()} but got "`,
          });

          notRegexpMatch.message += `${err.message}`;
          throw notRegexpMatch;
        }
      }
    }

    return;
  }

  throw error;
}

export function mockFile({
  sourceName,
  pragma,
}: {
  sourceName: string;
  pragma: string;
}): ResolvedFile {
  const absolutePath = path.join(process.cwd(), sourceName);

  const content = {
    rawContent: "",
    imports: [],
    versionPragmas: [pragma],
  };

  const lastModificationDate = new Date();

  return new ResolvedFile(
    sourceName,
    absolutePath,
    content,
    "<fake-content-hash>",
    lastModificationDate,
  );
}
