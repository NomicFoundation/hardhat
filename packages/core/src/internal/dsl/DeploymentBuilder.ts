import type {
  AddressResolvable,
  ArtifactContract,
  ArtifactLibrary,
  ContractCall,
  ContractFutureOld,
  DependableFuture,
  DeployedContract,
  DeploymentGraphFuture,
  EventFuture,
  EventParamFuture,
  EventParams,
  HardhatContract,
  HardhatLibrary,
  OptionalParameter,
  ParameterValue,
  ProxyFuture,
  RequiredParameter,
  SendFuture,
  StaticContractCall,
  Virtual,
} from "../../types/future";
import type { ArtifactOld } from "../../types/hardhat";
import type { Module, ModuleDict } from "../../types/module";

import { BigNumber, ethers } from "ethers";
import hash from "object-hash";

import { IgnitionError, IgnitionValidationError } from "../../errors";
import {
  ArtifactContractDeploymentVertex,
  ArtifactLibraryDeploymentVertex,
  CallDeploymentVertex,
  CallPoints,
  DeployedContractDeploymentVertex,
  DeploymentBuilderOptions,
  DeploymentGraphVertex,
  EventVertex,
  HardhatContractDeploymentVertex,
  HardhatLibraryDeploymentVertex,
  IDeploymentGraph,
  ScopeData,
  SendVertex,
  StaticCallDeploymentVertex,
  VirtualVertex,
} from "../../internal/types/deploymentGraph";
import {
  assertModuleReturnTypes,
  isArtifact,
  isContract,
  isDependable,
  isFuture,
  isParameter,
} from "../../internal/utils/guards";
import { resolveProxyDependency } from "../../internal/utils/proxy";
import {
  AwaitOptions,
  CallOptionsOld,
  ContractOptionsOld,
  IDeploymentBuilder,
  InternalParamValue,
  SendOptions,
  StaticCallOptionsOld,
  UseModuleOptions,
} from "../../types/dsl";
import { addEdge, ensureVertex } from "../graph/adjacencyList";

import { DeploymentGraph } from "./DeploymentGraph";
import { ScopeStack } from "./ScopeStack";

interface ArtifactMap {
  [contractName: string]: ArtifactOld;
}

/**
 * A module's data.
 *
 * @internal
 */
export interface ModuleData {
  result: Virtual & ModuleDict;
  optionsHash: string;
}

/**
 * A cache of modules.
 *
 * @internal
 */
export interface ModuleCache {
  [label: string]: ModuleData;
}

type DeploymentApiPublicFunctions =
  | InstanceType<typeof DeploymentBuilder>["contract"]
  | InstanceType<typeof DeploymentBuilder>["library"]
  | InstanceType<typeof DeploymentBuilder>["contractAt"]
  | InstanceType<typeof DeploymentBuilder>["call"]
  | InstanceType<typeof DeploymentBuilder>["staticCall"]
  | InstanceType<typeof DeploymentBuilder>["event"]
  | InstanceType<typeof DeploymentBuilder>["sendETH"]
  | InstanceType<typeof DeploymentBuilder>["useModule"];

const DEFAULT_VALUE = ethers.utils.parseUnits("0");

/**
 * A builder object for specifying the different parts  of your deployment
 * and their interdependencies.
 */
export class DeploymentBuilder implements IDeploymentBuilder {
  /** {@inheritDoc IDeploymentBuilder.chainId} */
  public chainId: number;

  /** {@inheritDoc IDeploymentBuilder.accounts} */
  public accounts: string[];

  /**
   * The deployment graph built from the configuration actions.
   *
   * @internal
   */
  public graph: IDeploymentGraph;

  /**
   * A mapping of deployment graph vertexes to the source code
   * position of the DeploymentBuilder action that created
   * them. Used during validation to provide better error
   * messages.
   *
   * @internal
   */
  public callPoints: CallPoints;

  private idCounter: number = 0;
  private moduleCache: ModuleCache = {};
  private useModuleInvocationCounter: number = 0;
  private scopes: ScopeStack = new ScopeStack();
  private artifactMap: ArtifactMap = {};

  constructor(options: DeploymentBuilderOptions) {
    this.chainId = options.chainId;
    this.accounts = options.accounts;
    this.graph = new DeploymentGraph();
    this.callPoints = {};

    for (const artifact of options.artifacts) {
      this.artifactMap[artifact.contractName] = artifact;
    }
  }

  public library(
    libraryName: string,
    options?: ContractOptionsOld
  ): HardhatLibrary;
  public library(
    libraryName: string,
    artifact: ArtifactOld,
    options?: ContractOptionsOld
  ): ArtifactLibrary;
  public library(
    libraryName: string,
    artifactOrOptions?: ContractOptionsOld | ArtifactOld,
    givenOptions?: ContractOptionsOld
  ): HardhatLibrary | ArtifactLibrary {
    if (isArtifact(artifactOrOptions)) {
      const artifact = artifactOrOptions;
      const options: ContractOptionsOld | undefined = givenOptions;

      const artifactContractFuture: ArtifactLibrary = {
        vertexId: this._resolveNextId(),
        label: libraryName,
        type: "library",
        subtype: "artifact",
        artifact,
        _future: true,
      };

      DeploymentBuilder._addVertex(this.graph, this.callPoints, this.library, {
        id: artifactContractFuture.vertexId,
        label: libraryName,
        type: "ArtifactLibrary",
        artifact,
        args: options?.args ?? [],
        scopeAdded: this.scopes.getScopedLabel(),
        after: options?.after ?? [],
        from: options?.from ?? this.accounts[0],
      });

      return artifactContractFuture;
    } else {
      const options: ContractOptionsOld | undefined = artifactOrOptions;

      const libraryFuture: HardhatLibrary = {
        vertexId: this._resolveNextId(),
        label: libraryName,
        type: "library",
        subtype: "hardhat",
        libraryName,
        _future: true,
      };

      DeploymentBuilder._addVertex(this.graph, this.callPoints, this.library, {
        id: libraryFuture.vertexId,
        label: libraryName,
        type: "HardhatLibrary",
        libraryName,
        args: options?.args ?? [],
        scopeAdded: this.scopes.getScopedLabel(),
        after: options?.after ?? [],
        from: options?.from ?? this.accounts[0],
      });

      return libraryFuture;
    }
  }

  public contract(
    contractName: string,
    options?: ContractOptionsOld
  ): HardhatContract;
  public contract(
    contractName: string,
    artifact: ArtifactOld,
    options?: ContractOptionsOld
  ): ArtifactContract;
  public contract(
    contractName: string,
    artifactOrOptions?: ArtifactOld | ContractOptionsOld,
    givenOptions?: ContractOptionsOld
  ): HardhatContract | ArtifactContract {
    if (isArtifact(artifactOrOptions)) {
      const artifact = artifactOrOptions;
      const options: ContractOptionsOld | undefined = givenOptions;

      const artifactContractFuture: ArtifactContract = {
        vertexId: this._resolveNextId(),
        label: contractName,
        type: "contract",
        subtype: "artifact",
        artifact,
        _future: true,
      };

      DeploymentBuilder._addVertex(this.graph, this.callPoints, this.contract, {
        id: artifactContractFuture.vertexId,
        label: contractName,
        type: "ArtifactContract",
        artifact,
        args: options?.args ?? [],
        libraries: options?.libraries ?? {},
        scopeAdded: this.scopes.getScopedLabel(),
        after: options?.after ?? [],
        value: options?.value ?? DEFAULT_VALUE,
        from: options?.from ?? this.accounts[0],
      });

      return artifactContractFuture;
    } else {
      const options: ContractOptionsOld | undefined = artifactOrOptions;

      const contractFuture: HardhatContract = {
        vertexId: this._resolveNextId(),
        label: contractName,
        type: "contract",
        subtype: "hardhat",
        contractName,
        _future: true,
      };

      DeploymentBuilder._addVertex(this.graph, this.callPoints, this.contract, {
        id: contractFuture.vertexId,
        label: contractName,
        type: "HardhatContract",
        contractName,
        args: options?.args ?? [],
        libraries: options?.libraries ?? {},
        scopeAdded: this.scopes.getScopedLabel(),
        after: options?.after ?? [],
        value: options?.value ?? DEFAULT_VALUE,
        from: options?.from ?? this.accounts[0],
      });

      return contractFuture;
    }
  }

  public contractAt(
    contractName: string,
    address: string | EventParamFuture,
    abi: any[],
    options?: { after?: DeploymentGraphFuture[] }
  ): DeployedContract {
    const deployedFuture: DeployedContract = {
      vertexId: this._resolveNextId(),
      label: contractName,
      type: "contract",
      subtype: "deployed",
      abi,
      address,
      _future: true,
    };

    DeploymentBuilder._addVertex(this.graph, this.callPoints, this.contractAt, {
      id: deployedFuture.vertexId,
      label: contractName,
      type: "DeployedContract",
      address,
      abi,
      scopeAdded: this.scopes.getScopedLabel(),
      after: options?.after ?? [],
    });

    return deployedFuture;
  }

  public call(
    contractFuture: DeploymentGraphFuture,
    functionName: string,
    { args, after, value, from }: CallOptionsOld
  ): ContractCall {
    const callFuture: ContractCall = {
      vertexId: this._resolveNextId(),
      label: `${contractFuture.label}/${functionName}`,
      type: "call",
      _future: true,
    };

    let contract: ContractFutureOld;
    if (isParameter(contractFuture)) {
      const parameter = contractFuture;
      const scope = parameter.scope;

      const scopeData = this.graph.scopeData[scope];

      if (
        scopeData === undefined ||
        scopeData.parameters === undefined ||
        !(parameter.label in scopeData.parameters)
      ) {
        throw new IgnitionError("Could not resolve contract from parameter");
      }

      contract = scopeData.parameters[parameter.label] as
        | HardhatContract
        | ArtifactContract
        | DeployedContract;
    } else if (isContract(contractFuture)) {
      contract = contractFuture;
    } else {
      throw new IgnitionError(
        `Not a contract future ${contractFuture.label} (${contractFuture.type})`
      );
    }

    DeploymentBuilder._addVertex(this.graph, this.callPoints, this.call, {
      id: callFuture.vertexId,
      label: callFuture.label,
      type: "Call",
      contract,
      method: functionName,
      args: args ?? [],
      after: after ?? [],
      scopeAdded: this.scopes.getScopedLabel(),
      value: value ?? DEFAULT_VALUE,
      from: from ?? this.accounts[0],
    });

    return callFuture;
  }

  public staticCall(
    contractFuture: DeploymentGraphFuture,
    functionName: string,
    { args, after, from }: StaticCallOptionsOld
  ): StaticContractCall {
    const staticCallFuture: StaticContractCall = {
      vertexId: this._resolveNextId(),
      label: `${contractFuture.label}/${functionName}`,
      type: "static-call",
      _future: true,
    };

    let contract: ContractFutureOld;
    if (isParameter(contractFuture)) {
      const parameter = contractFuture;
      const scope = parameter.scope;

      const scopeData = this.graph.scopeData[scope];

      if (
        scopeData === undefined ||
        scopeData.parameters === undefined ||
        !(parameter.label in scopeData.parameters)
      ) {
        throw new IgnitionError("Could not resolve contract from parameter");
      }

      contract = scopeData.parameters[parameter.label] as
        | HardhatContract
        | ArtifactContract
        | DeployedContract;
    } else if (isContract(contractFuture)) {
      contract = contractFuture;
    } else {
      throw new IgnitionError(
        `Not a contract future ${contractFuture.label} (${contractFuture.type})`
      );
    }

    DeploymentBuilder._addVertex(this.graph, this.callPoints, this.call, {
      id: staticCallFuture.vertexId,
      label: staticCallFuture.label,
      type: "StaticCall",
      contract,
      method: functionName,
      args: args ?? [],
      after: after ?? [],
      scopeAdded: this.scopes.getScopedLabel(),
      from: from ?? this.accounts[0],
    });

    return staticCallFuture;
  }

  public event(
    contractFuture: DeploymentGraphFuture,
    eventName: string,
    { args, after }: AwaitOptions
  ): EventFuture {
    const vertexId = this._resolveNextId();

    const eventFuture: EventFuture = {
      vertexId,
      label: `${contractFuture.label}/${eventName}`,
      type: "await",
      subtype: "event",
      _future: true,
      params: {},
    };

    let contract: ContractFutureOld;
    if (isParameter(contractFuture)) {
      const parameter = contractFuture;
      const scope = parameter.scope;

      const scopeData = this.graph.scopeData[scope];

      if (
        scopeData === undefined ||
        scopeData.parameters === undefined ||
        !(parameter.label in scopeData.parameters)
      ) {
        throw new IgnitionError("Could not resolve contract from parameter");
      }

      contract = scopeData.parameters[parameter.label] as
        | HardhatContract
        | ArtifactContract
        | DeployedContract;
    } else if (
      isContract(contractFuture) &&
      contractFuture.type === "contract"
    ) {
      contract = contractFuture;
    } else {
      throw new IgnitionError(
        `Not a contract future ${contractFuture.label} (${contractFuture.type})`
      );
    }

    let abi: any[];
    let address: string | ArtifactContract | HardhatContract | EventParamFuture;
    if (contract.subtype === "artifact") {
      abi = contract.artifact.abi;
      address = contract;
    } else if (contract.subtype === "deployed") {
      abi = contract.abi;
      address = contract.address;
    } else {
      abi = this.artifactMap[contract.contractName].abi;
      address = contract;
    }

    eventFuture.params = this._parseEventParams(abi, eventFuture);

    DeploymentBuilder._addVertex(this.graph, this.callPoints, this.event, {
      id: eventFuture.vertexId,
      label: eventFuture.label,
      type: "Event",
      address,
      abi,
      event: eventName,
      args: args ?? [],
      after: after ?? [],
      scopeAdded: this.scopes.getScopedLabel(),
    });

    return eventFuture;
  }

  public sendETH(sendTo: AddressResolvable, options: SendOptions): SendFuture {
    const vertexId = this._resolveNextId();

    const sendFuture: SendFuture = {
      vertexId,
      label: `send/${vertexId}`,
      type: "send",
      subtype: "eth",
      _future: true,
    };

    let address: AddressResolvable;
    if (typeof sendTo === "string" || isContract(sendTo)) {
      address = sendTo;
    } else if (isParameter(sendTo)) {
      const parameter = sendTo;
      const scope = parameter.scope;

      const scopeData = this.graph.scopeData[scope];

      if (
        scopeData === undefined ||
        scopeData.parameters === undefined ||
        !(parameter.label in scopeData.parameters)
      ) {
        throw new IgnitionError("Could not resolve contract from parameter");
      }

      address = scopeData.parameters[parameter.label] as ContractFutureOld;
    } else {
      if (sendTo.subtype !== "address") {
        throw new IgnitionError(
          `Event param "${sendTo.label}" is type "${sendTo.subtype}" but must be type "address"`
        );
      }

      address = sendTo;
    }

    DeploymentBuilder._addVertex(this.graph, this.callPoints, this.sendETH, {
      id: vertexId,
      label: sendFuture.label,
      type: "SendETH",
      address,
      value: options.value,
      after: options.after ?? [],
      scopeAdded: this.scopes.getScopedLabel(),
      from: options?.from ?? this.accounts[0],
    });

    return sendFuture;
  }

  public getParam(paramName: string): RequiredParameter {
    const paramFuture: RequiredParameter = {
      label: paramName,
      type: "parameter",
      subtype: "required",
      scope: this.scopes.getScopedLabel(),
      _future: true,
    };

    return paramFuture;
  }

  public getOptionalParam(
    paramName: string,
    defaultValue: ParameterValue
  ): OptionalParameter {
    const paramFuture: OptionalParameter = {
      label: paramName,
      type: "parameter",
      subtype: "optional",
      defaultValue,
      scope: this.scopes.getScopedLabel(),
      _future: true,
    };

    return paramFuture;
  }

  public getArtifact(contractName: string): ArtifactOld {
    const artifact = this.artifactMap[contractName];

    if (artifact === undefined) {
      throw new IgnitionError(`Artifact ${contractName} does not exist`);
    }

    return artifact;
  }

  public useModule<T extends ModuleDict>(
    module: Module<T>,
    options?: UseModuleOptions
  ): Virtual & T {
    const moduleKey = `module:${module.name}`;

    if (this.moduleCache[moduleKey] !== undefined) {
      const moduleData = this.moduleCache[moduleKey];

      const newHash = hash(options ?? null);

      if (moduleData.optionsHash !== newHash) {
        throw new IgnitionError(
          "`useModule` cannot be invoked on the same module using different parameters"
        );
      }

      return moduleData.result as Virtual & T;
    }

    const { result, after } = this._useSubscope(module, options);

    assertModuleReturnTypes(result);

    const moduleResult = { ...this._enhance(result, after), ...after };

    const optionsHash = hash(options ?? null);

    this.moduleCache[moduleKey] = { result: moduleResult, optionsHash };

    return moduleResult;
  }

  private _enhance<T extends ModuleDict>(result: T, after: Virtual): T {
    return Object.fromEntries(
      Object.entries(result).map(([key, value]) => [
        key,
        {
          label: key,
          type: "proxy",
          proxy: after,
          value,
          _future: true,
        } as ProxyFuture,
      ])
    ) as T;
  }

  private _createBeforeVirtualVertex(
    label: string,
    after: DeploymentGraphFuture[] = []
  ): Virtual {
    const beforeLabel = `${label}::before`;

    const virtualFuture: Virtual = {
      vertexId: this._resolveNextId(),
      label: beforeLabel,
      type: "virtual",
      _future: true,
    };

    const scopeLabel = this.scopes.getScopedLabel();

    DeploymentBuilder._addVertex(this.graph, this.callPoints, this.useModule, {
      id: virtualFuture.vertexId,
      label: beforeLabel,
      type: "Virtual",
      after,
      scopeAdded: scopeLabel,
    });

    return virtualFuture;
  }

  private _createAfterVirtualVertex(
    label: string,
    after: DeploymentGraphFuture[] = []
  ): Virtual {
    const afterLabel = `${label}::after`;

    const virtualFuture: Virtual = {
      vertexId: this._resolveNextId(),
      label: afterLabel,
      type: "virtual",
      _future: true,
    };

    const scopeLabel = this.scopes.getScopedLabel();

    DeploymentBuilder._addVertex(this.graph, this.callPoints, this.useModule, {
      id: virtualFuture.vertexId,
      label: afterLabel,
      type: "Virtual",
      after,
      scopeAdded: scopeLabel,
    });

    return virtualFuture;
  }

  private _resolveNextId(): number {
    return this.idCounter++;
  }

  private static _captureCallPoint(
    callPoints: CallPoints,
    f: DeploymentApiPublicFunctions,
    vertexId: number
  ) {
    const potentialValidationError = new IgnitionValidationError("");
    potentialValidationError.resetStackFrom(f as any);
    callPoints[vertexId] = potentialValidationError;
  }

  private static _addVertex(
    graph: DeploymentGraph,
    callPoints: CallPoints,
    f: DeploymentApiPublicFunctions,
    depNode: DeploymentGraphVertex
  ): void {
    DeploymentBuilder._captureCallPoint(callPoints, f, depNode.id);

    graph.vertexes.set(depNode.id, depNode);

    ensureVertex(graph.adjacencyList, depNode.id);

    switch (depNode.type) {
      case "HardhatContract":
        return DeploymentBuilder._addHardhatContractVertex(depNode, graph);
      case "ArtifactContract":
        return DeploymentBuilder._addArtifactContractVertex(depNode, graph);
      case "DeployedContract":
        return DeploymentBuilder._addDeployedContractVertex(depNode, graph);
      case "HardhatLibrary":
        return DeploymentBuilder._addHardhatLibraryVertex(depNode, graph);
      case "ArtifactLibrary":
        return DeploymentBuilder._addArtifactLibraryVertex(depNode, graph);
      case "Call":
        return DeploymentBuilder._addCallVertex(depNode, graph);
      case "StaticCall":
        return DeploymentBuilder._addStaticCallVertex(depNode, graph);
      case "Event":
        return DeploymentBuilder._addEventVertex(depNode, graph);
      case "SendETH":
        return DeploymentBuilder._addSendETHVertex(depNode, graph);
      case "Virtual":
        return DeploymentBuilder._addVirtualVertex(depNode, graph);
    }
  }

  private static _addVirtualVertex(
    depNode: VirtualVertex,
    graph: DeploymentGraph
  ) {
    DeploymentBuilder._addEdgesBasedOn(
      Object.values(depNode.after),
      graph,
      depNode
    );
  }

  private static _addSendETHVertex(
    depNode: SendVertex,
    graph: DeploymentGraph
  ) {
    DeploymentBuilder._addEdgeBasedOn(depNode.address, graph, depNode);

    DeploymentBuilder._addEdgesBasedOn(
      Object.values(depNode.after),
      graph,
      depNode
    );
  }

  private static _addEventVertex(depNode: EventVertex, graph: DeploymentGraph) {
    DeploymentBuilder._addEdgeBasedOn(depNode.address, graph, depNode);

    DeploymentBuilder._addEdgesBasedOn(
      Object.values(depNode.args),
      graph,
      depNode
    );
    DeploymentBuilder._addEdgesBasedOn(
      Object.values(depNode.after),
      graph,
      depNode
    );
  }

  private static _addCallVertex(
    depNode: CallDeploymentVertex,
    graph: DeploymentGraph
  ) {
    DeploymentBuilder._addEdgeBasedOn(depNode.contract, graph, depNode);

    DeploymentBuilder._addEdgesBasedOn(
      Object.values(depNode.args),
      graph,
      depNode
    );
    DeploymentBuilder._addEdgesBasedOn(
      Object.values(depNode.after),
      graph,
      depNode
    );
  }

  private static _addStaticCallVertex(
    depNode: StaticCallDeploymentVertex,
    graph: DeploymentGraph
  ) {
    DeploymentBuilder._addEdgeBasedOn(depNode.contract, graph, depNode);

    DeploymentBuilder._addEdgesBasedOn(
      Object.values(depNode.args),
      graph,
      depNode
    );
    DeploymentBuilder._addEdgesBasedOn(
      Object.values(depNode.after),
      graph,
      depNode
    );
  }

  private static _addArtifactLibraryVertex(
    depNode: ArtifactLibraryDeploymentVertex,
    graph: DeploymentGraph
  ) {
    DeploymentBuilder._addEdgesBasedOn(depNode.args, graph, depNode);
    DeploymentBuilder._addEdgesBasedOn(depNode.after, graph, depNode);
  }

  private static _addHardhatLibraryVertex(
    depNode: HardhatLibraryDeploymentVertex,
    graph: DeploymentGraph
  ) {
    DeploymentBuilder._addEdgesBasedOn(depNode.args, graph, depNode);
    DeploymentBuilder._addEdgesBasedOn(depNode.after, graph, depNode);
  }

  private static _addDeployedContractVertex(
    depNode: DeployedContractDeploymentVertex,
    graph: DeploymentGraph
  ) {
    DeploymentBuilder._addEdgesBasedOn(depNode.after, graph, depNode);
  }

  private static _addArtifactContractVertex(
    depNode: ArtifactContractDeploymentVertex,
    graph: DeploymentGraph
  ) {
    DeploymentBuilder._addEdgesBasedOn(depNode.args, graph, depNode);
    DeploymentBuilder._addEdgesBasedOn(
      Object.values(depNode.libraries),
      graph,
      depNode
    );
    DeploymentBuilder._addEdgesBasedOn(depNode.after, graph, depNode);
  }

  private static _addHardhatContractVertex(
    depNode: HardhatContractDeploymentVertex,
    graph: DeploymentGraph
  ) {
    DeploymentBuilder._addEdgesBasedOn(depNode.args, graph, depNode);
    DeploymentBuilder._addEdgesBasedOn(
      Object.values(depNode.libraries),
      graph,
      depNode
    );
    DeploymentBuilder._addEdgesBasedOn(depNode.after, graph, depNode);
  }

  private static _addEdgesBasedOn(
    args: InternalParamValue[],
    graph: DeploymentGraph,
    depNode: DeploymentGraphVertex
  ) {
    for (const arg of args) {
      DeploymentBuilder._addEdgeBasedOn(arg, graph, depNode);
    }
  }

  private static _addEdgeBasedOn(
    arg: InternalParamValue,
    graph: DeploymentGraph,
    depNode: DeploymentGraphVertex
  ) {
    if (
      typeof arg === "string" ||
      typeof arg === "number" ||
      typeof arg === "boolean" ||
      BigNumber.isBigNumber(arg) ||
      !isFuture(arg)
    ) {
      return;
    }

    if (isDependable(arg)) {
      addEdge(graph.adjacencyList, {
        from: resolveProxyDependency(arg).vertexId,
        to: depNode.id,
      });

      return;
    }

    if (arg.type === "eventParam") {
      addEdge(graph.adjacencyList, {
        from: arg.vertexId,
        to: depNode.id,
      });

      return;
    }

    if (isParameter(arg)) {
      const resolvedArg = DeploymentBuilder._resolveParameterFromScope(
        graph,
        arg
      );

      if (isDependable(resolvedArg)) {
        addEdge(graph.adjacencyList, {
          from: resolveProxyDependency(resolvedArg).vertexId,
          to: depNode.id,
        });
        return;
      }

      return;
    }
  }

  private static _resolveParameterFromScope(
    graph: DeploymentGraph,
    param: RequiredParameter | OptionalParameter
  ) {
    const scopeData = graph.scopeData[param.scope];

    if (scopeData === undefined || scopeData.parameters === undefined) {
      return param;
    }

    const scopeValue = scopeData.parameters[param.label];

    if (param.subtype === "optional") {
      return scopeValue ?? param.defaultValue;
    }

    if (scopeValue === undefined) {
      return param;
    }

    return scopeValue;
  }

  private _useSubscope<T extends ModuleDict>(
    module: Module<T>,
    options?: UseModuleOptions
  ) {
    const useModuleInvocationId = this.useModuleInvocationCounter++;
    const label = `${module.name}:${useModuleInvocationId}`;

    this.scopes.push(label);
    const scopeLabel = this.scopes.getScopedLabel();

    const beforeVirtualVertex = this._createBeforeVirtualVertex(
      label,
      options?.after
    );

    const scopeData: ScopeData = {
      before: beforeVirtualVertex,
      parameters: options?.parameters,
    };

    this.graph.scopeData[scopeLabel] = scopeData;

    const result = module.action(this);

    const addedVertexes = [...this.graph.vertexes.values()]
      .filter((v) => v.scopeAdded === scopeLabel)
      .filter((v) => v.type !== "Virtual")
      .map(
        (v): DependableFuture => ({
          vertexId: v.id,
          label: v.label,
          type: "virtual",
          _future: true,
        })
      );

    for (const addedVertex of addedVertexes) {
      addEdge(this.graph.adjacencyList, {
        from: beforeVirtualVertex.vertexId,
        to: resolveProxyDependency(addedVertex).vertexId,
      });
    }

    const afterVirtualVertex = this._createAfterVirtualVertex(
      label,
      addedVertexes
    );

    scopeData.after = afterVirtualVertex;

    this.scopes.pop();

    return { before: beforeVirtualVertex, result, after: afterVirtualVertex };
  }

  private _parseEventParams(
    abi: Array<{ type: string; name: string; inputs: any[] }>,
    event: EventFuture
  ): EventParams {
    const [_, eventName] = event.label.split("/");

    const abiEvent = abi.find(
      (v) => v.type === "event" && v.name === eventName
    );

    if (abiEvent === undefined) {
      return {};
    }

    return abiEvent.inputs.reduce<EventParams>((acc, { name, type }) => {
      acc[name] = {
        vertexId: event.vertexId,
        label: name,
        type: "eventParam",
        subtype: type,
        _future: true,
      };

      return acc;
    }, {});
  }
}
