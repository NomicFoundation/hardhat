import {
  Ignition,
  IgnitionDeployOptions,
  Providers,
  Module,
  ModuleDict,
  ModuleParams,
  createServices,
  ICommandJournal,
} from "@ignored/ignition-core";
import { Contract, ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { CommandJournal } from "./CommandJournal";
import { renderToCli } from "./ui/renderToCli";

type HardhatEthers = HardhatRuntimeEnvironment["ethers"];

interface DeployResult {
  [key: string]: string | number | Contract | ethers.utils.Result;
}

export class IgnitionWrapper {
  constructor(
    private _providers: Providers,
    private _ethers: HardhatEthers,
    private _deployOptions: Omit<IgnitionDeployOptions, keyof { ui?: boolean }>
  ) {}

  public async deploy<T extends ModuleDict>(
    ignitionModule: Module<T>,
    deployParams?: {
      parameters?: ModuleParams;
      journalPath?: string | undefined;
      ui?: boolean;
      journal?: ICommandJournal;
    }
  ): Promise<DeployResult> {
    const showUi = deployParams?.ui ?? false;

    const ignition = new Ignition({
      services: createServices(this._providers),
      uiRenderer: showUi
        ? renderToCli(this._providers.config.parameters)
        : undefined,
      journal: deployParams?.journal
        ? deployParams?.journal
        : deployParams?.journalPath !== undefined
        ? new CommandJournal(deployParams?.journalPath)
        : undefined,
    });

    if (deployParams?.parameters !== undefined) {
      await this._providers.config.setParams(deployParams.parameters);
    }

    const [deploymentResult] = await ignition.deploy(
      ignitionModule,
      this._deployOptions
    );

    if (deploymentResult._kind === "hold") {
      const heldVertexes = deploymentResult.holds;

      let heldMessage = "";
      for (const vertex of heldVertexes) {
        heldMessage += `  - ${vertex.label}\n`;
      }

      throw new Error(
        `Execution held for module '${ignitionModule.name}':\n\n${heldMessage}`
      );
    }

    if (deploymentResult._kind === "failure") {
      const [moduleId, failures] = deploymentResult.failures;

      let failuresMessage = "";
      for (const failure of failures) {
        failuresMessage += `  - ${failure.message}\n`;
      }

      throw new Error(
        `Execution failed for module '${moduleId}':\n\n${failuresMessage}`
      );
    }

    const resolvedOutput: {
      [key: string]: string | number | Contract | ethers.utils.Result;
    } = {};
    for (const [key, serializedFutureResult] of Object.entries(
      deploymentResult.result
    )) {
      if (
        serializedFutureResult._kind === "string" ||
        serializedFutureResult._kind === "number"
      ) {
        resolvedOutput[key] = serializedFutureResult.value;
      } else if (serializedFutureResult._kind === "tx") {
        resolvedOutput[key] = serializedFutureResult.value.hash;
      } else if (serializedFutureResult._kind === "event") {
        resolvedOutput[key] = serializedFutureResult.value.topics;
      } else {
        const { abi, address } = serializedFutureResult.value;

        const contract: any = await this._ethers.getContractAt(abi, address);
        contract.abi = abi;
        resolvedOutput[key] = contract;
      }
    }

    return resolvedOutput;
  }

  public async plan<T extends ModuleDict>(ignitionModule: Module<T>) {
    const ignition = new Ignition({
      services: createServices(this._providers),
    });

    return ignition.plan(ignitionModule);
  }
}
