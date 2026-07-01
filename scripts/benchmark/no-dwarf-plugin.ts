// Benchmark-only Hardhat plugin: reproduce non-DWARF solx compile times without
// touching the production hardhat-solx plugin.
//
// hardhat-solx force-injects the DWARF debugInfo selectors during config
// resolution (DWARF is a hard requirement for EDR stack traces, so the shipped
// plugin has no opt-out). To measure the *cost* of that DWARF emission, the
// benchmark registers this plugin AFTER hardhat-solx. Hardhat runs config hooks
// in reverse registration order, so this handler wraps hardhat-solx's: it awaits
// `next()` (letting hardhat-solx inject DWARF), then strips those selectors back
// out when HARDHAT_SOLX_DISABLE_DEBUG_INFO=true. Everything else the plugin set
// (optimizer -O1, viaIR) is left intact, so a no-dwarf cell differs from its
// DWARF-on twin by DWARF alone.
//
// Lives in scripts/ (type-checked + unit-tested); preinstall.sh copies it next
// to the wrapper config in the scenario clone at benchmark time.

// Mirrors SOLX_DEBUG_INFO_SELECTORS in @nomicfoundation/hardhat-solx. Duplicated
// (not imported) so this file stays dependency-free and type-checks under
// scripts/, where `hardhat` is not resolvable.
export const SOLX_DEBUG_INFO_SELECTORS = [
  "evm.bytecode.debugInfo",
  "evm.deployedBytecode.debugInfo",
];

const DISABLE_DEBUG_INFO_ENV_VAR = "HARDHAT_SOLX_DISABLE_DEBUG_INFO";

function stripSelectorsFromOutputSelection(outputSelection: any): any {
  if (outputSelection === null || typeof outputSelection !== "object") {
    return outputSelection;
  }
  const result = {};
  for (const [file, contracts] of Object.entries(outputSelection)) {
    result[file] = {};
    for (const [contract, selectors] of Object.entries(contracts)) {
      result[file][contract] = Array.isArray(selectors)
        ? selectors.filter((s) => !SOLX_DEBUG_INFO_SELECTORS.includes(s))
        : selectors;
    }
  }
  return result;
}

function stripFromCompilerEntry(entry: any): any {
  if (entry === null || typeof entry !== "object" || entry.type !== "solx") {
    return entry;
  }
  const settings = entry.settings ?? {};
  return {
    ...entry,
    settings: {
      ...settings,
      outputSelection: stripSelectorsFromOutputSelection(
        settings.outputSelection,
      ),
    },
  };
}

// Pure inverse of hardhat-solx's `augmentSolxOutputSelectionInProfiles`: removes
// the DWARF selectors from every solx-typed compiler and override, leaving
// non-solx entries and all other selectors untouched.
export function stripSolxDebugInfoSelectors(profiles: any): any {
  const result = {};
  for (const [profileName, profile] of Object.entries<any>(profiles)) {
    const overrides = {};
    for (const [key, override] of Object.entries<any>(
      profile.overrides ?? {},
    )) {
      overrides[key] = stripFromCompilerEntry(override);
    }
    result[profileName] = {
      ...profile,
      compilers: (profile.compilers ?? []).map(stripFromCompilerEntry),
      overrides,
    };
  }
  return result;
}

export async function resolveUserConfigWithoutDebugInfo(
  userConfig: any,
  resolveConfigurationVariable: any,
  next: any,
): Promise<any> {
  const resolvedConfig = await next(userConfig, resolveConfigurationVariable);
  if (process.env[DISABLE_DEBUG_INFO_ENV_VAR] !== "true") {
    return resolvedConfig;
  }
  return {
    ...resolvedConfig,
    solidity: {
      ...resolvedConfig.solidity,
      profiles: stripSolxDebugInfoSelectors(resolvedConfig.solidity.profiles),
    },
  };
}

export const noDwarfBenchmarkPlugin = {
  id: "solx-benchmark-no-dwarf",
  hookHandlers: {
    // Hardhat calls this category factory, then invokes its `.default` export to
    // get the handlers — mirroring how a real plugin lazy-imports a module whose
    // default export is the hook factory (see hardhat-solx's index.ts).
    config: async () => ({
      default: async () => ({
        resolveUserConfig: resolveUserConfigWithoutDebugInfo,
      }),
    }),
  },
};
