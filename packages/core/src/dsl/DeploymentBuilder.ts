import { BigNumber, ethers } from "ethers";
import hash from "object-hash";

import { addEdge, ensureVertex } from "graph/adjacencyList";
import {
  CallOptions,
  ContractOptions,
  InternalParamValue,
  IDeploymentGraph,
  IDeploymentBuilder,
  DeploymentBuilderOptions,
  DeploymentGraphVertex,
  UseSubgraphOptions,
  ScopeData,
  AwaitOptions,
  SendOptions,
  CallPoints,
} from "types/deploymentGraph";
import type {
  DeploymentGraphFuture,
  HardhatContract,
  ArtifactLibrary,
  HardhatLibrary,
  ArtifactContract,
  DeployedContract,
  ContractCall,
  RequiredParameter,
  OptionalParameter,
  ParameterValue,
  FutureDict,
  CallableFuture,
  Virtual,
  DependableFuture,
  ProxyFuture,
  EventFuture,
  BytesFuture,
  EventParams,
  ArtifactFuture,
  EventParamFuture,
  SendFuture,
  ContractFuture,
  AddressResolvable,
} from "types/future";
import type { Artifact } from "types/hardhat";
import type { ModuleCache, ModuleDict, Subgraph } from "types/module";
import { IgnitionError, IgnitionValidationError } from "utils/errors";
import {
  assertModuleReturnTypes,
  assertUnknownDeploymentVertexType,
  isArtifact,
  isCallable,
  isContract,
  isDependable,
  isParameter,
} from "utils/guards";
import { resolveProxyDependency } from "utils/proxy";

import { DeploymentGraph } from "./DeploymentGraph";
import { ScopeStack } from "./ScopeStack";

type DeploymentApiPublicFunctions =
  | InstanceType<typeof DeploymentBuilder>["contract"]
  | InstanceType<typeof DeploymentBuilder>["library"]
  | InstanceType<typeof DeploymentBuilder>["contractAt"]
  | InstanceType<typeof DeploymentBuilder>["call"]
  | InstanceType<typeof DeploymentBuilder>["event"]
  | InstanceType<typeof DeploymentBuilder>["sendETH"]
  | InstanceType<typeof DeploymentBuilder>["useModule"];

const DEFAULT_VALUE = ethers.utils.parseUnits("0");

function parseEventParams(
  abi: Array<{ type: string; name: string; inputs: any[] }>,
  event: EventFuture
): EventParams {
  const [_, eventName] = event.label.split("/");

  const abiEvent = abi.find((v) => v.type === "event" && v.name === eventName);

  if (!abiEvent) {
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

export class DeploymentBuilder implements IDeploymentBuilder {
  public chainId: number;
  public graph: IDeploymentGraph;
  public callPoints: CallPoints;

  private idCounter: number = 0;
  private moduleCache: ModuleCache = {};
  private useSubgraphInvocationCounter: number = 0;
  private scopes: ScopeStack = new ScopeStack();

  constructor(options: DeploymentBuilderOptions) {
    this.chainId = options.chainId;
    this.graph = new DeploymentGraph();
    this.callPoints = {};
  }

  public library(
    libraryName: string,
    options?: ContractOptions
  ): HardhatLibrary;
  public library(
    libraryName: string,
    artifact: Artifact,
    options?: ContractOptions
  ): ArtifactLibrary;
  public library(
    libraryName: string,
    artifactOrOptions?: ContractOptions | Artifact,
    givenOptions?: ContractOptions
  ): HardhatLibrary | ArtifactLibrary {
    if (isArtifact(artifactOrOptions)) {
      const artifact = artifactOrOptions;
      const options: ContractOptions | undefined = givenOptions;

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
      });

      return artifactContractFuture;
    } else {
      const options: ContractOptions | undefined = artifactOrOptions;

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
      });

      return libraryFuture;
    }
  }

  public contract(
    contractName: string,
    options?: ContractOptions
  ): HardhatContract;
  public contract(
    contractName: string,
    artifact: Artifact,
    options?: ContractOptions
  ): ArtifactContract;
  public contract(
    contractName: string,
    artifactOrOptions?: Artifact | ContractOptions,
    givenOptions?: ContractOptions
  ): HardhatContract | ArtifactContract {
    if (isArtifact(artifactOrOptions)) {
      const artifact = artifactOrOptions;
      const options: ContractOptions | undefined = givenOptions;

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
      });

      return artifactContractFuture;
    } else {
      const options: ContractOptions | undefined = artifactOrOptions;

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
    { args, after, value }: CallOptions
  ): ContractCall {
    const callFuture: ContractCall = {
      vertexId: this._resolveNextId(),
      label: `${contractFuture.label}/${functionName}`,
      type: "call",
      _future: true,
    };

    let contract: CallableFuture;
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
    } else if (isCallable(contractFuture)) {
      contract = contractFuture;
    } else {
      throw new IgnitionError(
        `Not a callable future ${contractFuture.label} (${contractFuture.type})`
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
    });

    return callFuture;
  }

  public event(
    artifactFuture: ArtifactFuture,
    eventName: string,
    { args, after }: AwaitOptions
  ): EventFuture {
    const vertexId = this._resolveNextId();

    const eventFuture: EventFuture = {
      vertexId,
      label: `${artifactFuture.label}/${eventName}`,
      type: "await",
      subtype: "event",
      _future: true,
      params: {},
    };

    if (
      artifactFuture.subtype !== "artifact" &&
      artifactFuture.subtype !== "deployed"
    ) {
      const future = artifactFuture as any;

      throw new IgnitionError(
        `Not an artifact future ${future.label} (${future.type})`
      );
    }

    let abi: any[];
    let address: string | ArtifactContract | EventParamFuture;
    if (artifactFuture.subtype === "artifact") {
      abi = artifactFuture.artifact.abi;
      address = artifactFuture;
    } else {
      abi = artifactFuture.abi;
      address = artifactFuture.address;
    }

    eventFuture.params = parseEventParams(abi, eventFuture);

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

      address = scopeData.parameters[parameter.label] as ContractFuture;
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

  public getBytesForArtifact(artifactName: string): BytesFuture {
    const bytesFuture: BytesFuture = {
      label: artifactName,
      type: "bytes",
      _future: true,
    };

    return bytesFuture;
  }

  public useSubgraph<T extends FutureDict>(
    subgraph: Subgraph<T>,
    options?: UseSubgraphOptions
  ): Virtual & T {
    const { result, after } = this._useSubscope(subgraph, options);

    return { ...result, ...after };
  }

  public useModule<T extends ModuleDict>(
    module: Subgraph<T>,
    options?: UseSubgraphOptions
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
  ) {
    DeploymentBuilder._captureCallPoint(callPoints, f, depNode.id);

    graph.vertexes.set(depNode.id, depNode);
    ensureVertex(graph.adjacencyList, depNode.id);

    if (depNode.type === "HardhatContract") {
      DeploymentBuilder._addEdgesBasedOn(depNode.args, graph, depNode);
      DeploymentBuilder._addEdgesBasedOn(
        Object.values(depNode.libraries),
        graph,
        depNode
      );
      DeploymentBuilder._addEdgesBasedOn(depNode.after, graph, depNode);
      return;
    }

    if (depNode.type === "ArtifactContract") {
      DeploymentBuilder._addEdgesBasedOn(depNode.args, graph, depNode);
      DeploymentBuilder._addEdgesBasedOn(
        Object.values(depNode.libraries),
        graph,
        depNode
      );
      DeploymentBuilder._addEdgesBasedOn(depNode.after, graph, depNode);
      return;
    }

    if (depNode.type === "DeployedContract") {
      DeploymentBuilder._addEdgesBasedOn(depNode.after, graph, depNode);
      return;
    }

    if (depNode.type === "HardhatLibrary") {
      DeploymentBuilder._addEdgesBasedOn(depNode.args, graph, depNode);
      DeploymentBuilder._addEdgesBasedOn(depNode.after, graph, depNode);
      return;
    }

    if (depNode.type === "ArtifactLibrary") {
      DeploymentBuilder._addEdgesBasedOn(depNode.args, graph, depNode);
      DeploymentBuilder._addEdgesBasedOn(depNode.after, graph, depNode);
      return;
    }

    if (depNode.type === "Call") {
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
      return;
    }

    if (depNode.type === "Event") {
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
      return;
    }

    if (depNode.type === "SendETH") {
      DeploymentBuilder._addEdgeBasedOn(depNode.address, graph, depNode);

      DeploymentBuilder._addEdgesBasedOn(
        Object.values(depNode.after),
        graph,
        depNode
      );
      return;
    }

    if (depNode.type === "Virtual") {
      DeploymentBuilder._addEdgesBasedOn(
        Object.values(depNode.after),
        graph,
        depNode
      );
      return;
    }

    assertUnknownDeploymentVertexType(depNode);
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
      BigNumber.isBigNumber(arg)
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

  private _useSubscope<T extends FutureDict>(
    subgraphOrModule: Subgraph<T>,
    options?: UseSubgraphOptions
  ) {
    const useModuleInvocationId = this.useSubgraphInvocationCounter++;
    const label = `${subgraphOrModule.name}:${useModuleInvocationId}`;

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

    const result = subgraphOrModule.action(this);

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
}
