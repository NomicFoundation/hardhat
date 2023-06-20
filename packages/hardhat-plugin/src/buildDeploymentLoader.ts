import {
  DeploymentLoader,
  Journal,
  MemoryJournal,
} from "@ignored/ignition-core";
import fs from "fs-extra";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";
import { errorMonitor } from "stream";

class IgnitionDeploymentLoader implements DeploymentLoader {
  private _paths: {
    deploymentDir: string;
    artifactsDir: string;
    journalPath: string;
    deployedAddressesPath: string;
  } | null = null;

  constructor(private readonly _ignitionDir: string, public journal: Journal) {}

  public async initialize(deploymentId: string): Promise<void> {
    // TODO: validate the deployment id
    const deploymentDir = path.join(
      this._ignitionDir,
      "deployments",
      deploymentId
    );
    const artifactsDir = path.join(deploymentDir, "artifacts");
    const journalPath = path.join(deploymentDir, "journal.jsonl");
    const deployedAddressesPath = path.join(
      deploymentDir,
      "deployed_addresses.json"
    );

    this._paths = {
      deploymentDir,
      artifactsDir,
      journalPath,
      deployedAddressesPath,
    };

    await fs.ensureDir(this._paths.deploymentDir);
    await fs.ensureDir(this._paths.artifactsDir);
    await fs.ensureFile(this._paths.journalPath);
    await fs.ensureFile(this._paths.deployedAddressesPath);
  }

  public async recordDeployedAddress(
    futureId: string,
    contractAddress: string
  ): Promise<void> {
    if (this._paths === null) {
      // TODO: change this to assertion with move to core
      throw new Error("Cannot record deploy address until initialize");
    }

    try {
      // TODO: should this be made async to be closer to a single fs transaction?
      const json = (
        await fs.readFile(this._paths.deployedAddressesPath)
      ).toString();

      const deployedAddresses: { [key: string]: string } = JSON.parse(
        json === "" ? "{}" : json
      );

      deployedAddresses[futureId] = contractAddress;

      await fs.writeFile(
        this._paths.deployedAddressesPath,
        `${JSON.stringify(deployedAddresses, undefined, 2)}\n`
      );
    } catch (error) {
      console.error(errorMonitor);
    }
  }
}

export function buildDeploymentLoader(
  hre: HardhatRuntimeEnvironment
): DeploymentLoader {
  // TODO: bring back check with file journaling proper
  const isHardhatNetwork = true; // hre.network.name === "hardhat";

  const journal = isHardhatNetwork ? new MemoryJournal() : new MemoryJournal();

  return new IgnitionDeploymentLoader(hre.config.paths.ignition, journal);
}
