import type { BuildInfo } from "hardhat/types/artifacts";
import type { SolidityBuildProfileConfig } from "hardhat/types/config";

import { deepEqual } from "@nomicfoundation/hardhat-utils/lang";

interface BytecodeAffectingSettings {
  optimizer: {
    enabled: boolean;
    runs: number;
    details: unknown;
  };
  viaIR: boolean;
  evmVersion: string | undefined;
  metadata: unknown;
}

// Duplicated from packages/hardhat/src/internal/builtin-plugins/solidity/build-system/solc-info.ts.
// That module is internal (no public export), and we only need the lookup to
// backfill `evmVersion` symmetrically when comparing a profile's settings against
// the artifact's settings.
const defaultEvmTargets: { [key: string]: string } = {
  "0.5.1": "byzantium",
  "0.5.2": "byzantium",
  "0.5.3": "byzantium",
  "0.5.4": "byzantium",
  "0.5.5": "petersburg",
  "0.5.6": "petersburg",
  "0.5.7": "petersburg",
  "0.5.8": "petersburg",
  "0.5.9": "petersburg",
  "0.5.10": "petersburg",
  "0.5.11": "petersburg",
  "0.5.12": "petersburg",
  "0.5.13": "petersburg",
  "0.5.14": "istanbul",
  "0.5.15": "istanbul",
  "0.5.16": "istanbul",
  "0.5.17": "istanbul",
  "0.6.0": "istanbul",
  "0.6.1": "istanbul",
  "0.6.2": "istanbul",
  "0.6.3": "istanbul",
  "0.6.4": "istanbul",
  "0.6.5": "istanbul",
  "0.6.6": "istanbul",
  "0.6.7": "istanbul",
  "0.6.8": "istanbul",
  "0.6.9": "istanbul",
  "0.6.10": "istanbul",
  "0.6.11": "istanbul",
  "0.6.12": "istanbul",
  "0.7.0": "istanbul",
  "0.7.1": "istanbul",
  "0.7.2": "istanbul",
  "0.7.3": "istanbul",
  "0.7.4": "istanbul",
  "0.7.5": "istanbul",
  "0.7.6": "istanbul",
  "0.8.0": "istanbul",
  "0.8.1": "istanbul",
  "0.8.2": "istanbul",
  "0.8.3": "istanbul",
  "0.8.4": "istanbul",
  "0.8.5": "berlin",
  "0.8.6": "berlin",
  "0.8.7": "london",
  "0.8.8": "london",
  "0.8.9": "london",
  "0.8.10": "london",
  "0.8.11": "london",
  "0.8.12": "london",
  "0.8.13": "london",
  "0.8.14": "london",
  "0.8.15": "london",
  "0.8.16": "london",
  "0.8.17": "london",
  "0.8.18": "paris",
  "0.8.19": "paris",
  "0.8.20": "shanghai",
  "0.8.21": "shanghai",
  "0.8.22": "shanghai",
  "0.8.23": "shanghai",
  "0.8.24": "shanghai",
  "0.8.25": "cancun",
  "0.8.26": "cancun",
  "0.8.27": "cancun",
  "0.8.28": "cancun",
  "0.8.29": "cancun",
  "0.8.30": "prague",
  "0.8.31": "osaka",
  "0.8.32": "osaka",
  "0.8.33": "osaka",
  "0.8.34": "osaka",
};

function getEvmVersionFromSolcVersion(solcVersion: string): string | undefined {
  return defaultEvmTargets[solcVersion];
}

/**
 * Extracts the bytecode-affecting subset of a settings object, applying
 * fallbacks so both sides of a comparison are apples-to-apples.
 *
 * `outputSelection`, `libraries`, and `remappings` are excluded — they are
 * framework/dependency-graph-driven and would cause false negatives.
 */
export function extractBytecodeAffectingSettings(
  inputSettings: { [key: string]: any } | undefined,
  solcVersion: string,
): BytecodeAffectingSettings {
  return {
    optimizer: {
      enabled: inputSettings?.optimizer?.enabled ?? false,
      runs: inputSettings?.optimizer?.runs ?? 200,
      details: inputSettings?.optimizer?.details,
    },
    viaIR: inputSettings?.viaIR ?? false,
    evmVersion:
      inputSettings?.evmVersion ?? getEvmVersionFromSolcVersion(solcVersion),
    metadata: inputSettings?.metadata,
  };
}

/**
 * Picks the settings that a profile would use to compile a given user-source
 * file at a given solc version. Returns `undefined` if the profile has no
 * compiler matching `solcVersion` (in which case the profile cannot match the
 * artifact).
 */
export function resolveProfileSettingsForSource(
  profile: SolidityBuildProfileConfig,
  userSourceName: string,
  solcVersion: string,
): { [key: string]: any } | undefined {
  const override = profile.overrides[userSourceName];
  if (override !== undefined && override.version === solcVersion) {
    return override.settings;
  }
  const compiler = profile.compilers.find((c) => c.version === solcVersion);
  return compiler?.settings;
}

/**
 * Returns the names of all build profiles whose bytecode-affecting
 * settings (for the given source file and solc version) match the build
 * info's settings.
 */
export async function getMatchingBuildProfileNames(
  buildInfo: BuildInfo,
  userSourceName: string,
  buildProfiles: Record<string, SolidityBuildProfileConfig>,
): Promise<string[]> {
  const artifactBytecodeSettings = extractBytecodeAffectingSettings(
    buildInfo.input.settings,
    buildInfo.solcVersion,
  );

  const results: string[] = [];
  for (const [name, profile] of Object.entries(buildProfiles)) {
    const profileInputSettings = resolveProfileSettingsForSource(
      profile,
      userSourceName,
      buildInfo.solcVersion,
    );
    if (profileInputSettings === undefined) {
      continue;
    }
    const profileBytecodeSettings = extractBytecodeAffectingSettings(
      profileInputSettings,
      buildInfo.solcVersion,
    );
    if (await deepEqual(artifactBytecodeSettings, profileBytecodeSettings)) {
      results.push(name);
    }
  }
  return results;
}
