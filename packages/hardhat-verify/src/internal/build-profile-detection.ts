import type { BuildInfo } from "hardhat/types/artifacts";
import type { SolidityBuildProfileConfig } from "hardhat/types/config";
import type {
  CompilerInput,
  SolidityBuildSystem,
} from "hardhat/types/solidity";

import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { deepEqual } from "@nomicfoundation/hardhat-utils/lang";

export interface ArtifactCandidate {
  contract: string;
  rootFilePath: string;
  artifactSettings: CompilerInput["settings"];
}

/**
 * Builds a candidate from an FQN and its build info, ready to be compared
 * against build profiles by `findArtifactBuildProfile`.
 */
export function makeArtifactCandidate(
  contract: string,
  userSourceName: string,
  buildInfo: BuildInfo,
  projectRoot: string,
): ArtifactCandidate {
  const inputSourceName = buildInfo.userSourceNameMap[userSourceName];
  assertHardhatInvariant(
    inputSourceName !== undefined,
    `Source name "${userSourceName}" is missing from the build info's userSourceNameMap.`,
  );
  const rootFilePath = inputSourceName.startsWith("npm/")
    ? `npm:${userSourceName}`
    : path.join(projectRoot, userSourceName);
  return {
    contract,
    rootFilePath,
    artifactSettings: buildInfo.input.settings,
  };
}

/**
 * Returns the first (candidate, profileName) pair where the candidate's
 * bytecode-affecting compiler settings match a build profile other than
 * the active one. Returns `undefined` if no such pair exists.
 *
 * For each non-active profile we ask the build system to produce the solc
 * input it would generate for all candidates at once (one `getCompilationJobs`
 * call per profile), and compare each candidate's `buildInfo.input.settings`
 * against that. We deliberately compare everything except `outputSelection`,
 * `libraries`, and `remappings` as those are framework / dependency-graph
 * driven and would always differ.
 */
export async function findArtifactBuildProfile(
  solidity: SolidityBuildSystem,
  candidates: ArtifactCandidate[],
  buildProfiles: Record<string, SolidityBuildProfileConfig>,
  activeBuildProfileName: string,
): Promise<{ contract: string; profileName: string } | undefined> {
  const rootFilePaths = candidates.map((c) => c.rootFilePath);

  for (const profileName of Object.keys(buildProfiles)) {
    if (profileName === activeBuildProfileName) {
      continue;
    }

    const jobsResult = await solidity.getCompilationJobs(rootFilePaths, {
      buildProfile: profileName,
      quiet: true,
      force: true,
    });

    if (!jobsResult.success) {
      // The profile can't compile these files (e.g. no compatible solc).
      continue;
    }

    for (const candidate of candidates) {
      const job = jobsResult.compilationJobsPerFile.get(candidate.rootFilePath);
      if (job === undefined) {
        continue;
      }
      const profileInput = await job.getSolcInput();
      if (
        await bytecodeAffectingSettingsEqual(
          candidate.artifactSettings,
          profileInput.settings,
        )
      ) {
        return { contract: candidate.contract, profileName };
      }
    }
  }

  return undefined;
}

async function bytecodeAffectingSettingsEqual(
  a: CompilerInput["settings"],
  b: CompilerInput["settings"],
): Promise<boolean> {
  return await deepEqual(stripFrameworkSettings(a), stripFrameworkSettings(b));
}

function stripFrameworkSettings(
  settings: CompilerInput["settings"],
): Omit<
  CompilerInput["settings"],
  "outputSelection" | "libraries" | "remappings"
> {
  const {
    outputSelection: _outputSelection,
    libraries: _libraries,
    remappings: _remappings,
    ...rest
  } = settings;
  return rest;
}
