import hash from "object-hash";

import { addEdge, ensureVertex } from "graph/adjacencyList";
import {
  ContractOptions,
  InternalParamValue,
  IDeploymentGraph,
  IDeploymentBuilder,
  Subgraph,
  DeploymentBuilderOptions,
  DeploymentGraphVertex,
  UseSubgraphOptions,
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
} from "types/future";
import type { Artifact } from "types/hardhat";
import type { Module, ModuleCache, ModuleDict } from "types/module";
import { IgnitionError } from "utils/errors";
import {
  isArtifact,
  isCallable,
  isDependable,
  isModule,
  isParameter,
  isSubgraph,
} from "utils/guards";

import { DeploymentGraph } from "./DeploymentGraph";
import { ScopeStack } from "./ScopeStack";

export class DeploymentBuilder implements IDeploymentBuilder {
  public chainId: number;
  public graph: IDeploymentGraph = new DeploymentGraph();
  private idCounter: number = 0;
  private moduleCache: ModuleCache = {};
  private useSubgraphInvocationCounter: number = 0;
  private scopes: ScopeStack = new ScopeStack();

  constructor(options: DeploymentBuilderOptions) {
    this.chainId = options.chainId;
  }

  public library(
    libraryName: string,
    artifactOrOptions?: ContractOptions | Artifact | undefined,
    givenOptions?: ContractOptions | undefined
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

      DeploymentBuilder._addVertex(this.graph, {
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

      DeploymentBuilder._addVertex(this.graph, {
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

      DeploymentBuilder._addVertex(this.graph, {
        id: artifactContractFuture.vertexId,
        label: contractName,
        type: "ArtifactContract",
        artifact,
        args: options?.args ?? [],
        libraries: options?.libraries ?? {},
        scopeAdded: this.scopes.getScopedLabel(),
        after: options?.after ?? [],
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

      DeploymentBuilder._addVertex(this.graph, {
        id: contractFuture.vertexId,
        label: contractName,
        type: "HardhatContract",
        contractName,
        args: options?.args ?? [],
        libraries: options?.libraries ?? {},
        scopeAdded: this.scopes.getScopedLabel(),
        after: options?.after ?? [],
      });

      return contractFuture;
    }
  }

  public contractAt(
    contractName: string,
    address: string,
    abi: any[],
    options?: { after?: DeploymentGraphFuture[] }
  ): DeployedContract {
    const deployedFuture: DeployedContract = {
      vertexId: this._resolveNextId(),
      label: contractName,
      type: "contract",
      subtype: "deployed",
      abi,
      _future: true,
    };

    DeploymentBuilder._addVertex(this.graph, {
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
    {
      args,
      after,
    }: {
      args: Array<boolean | string | number | DeploymentGraphFuture>;
      after?: DeploymentGraphFuture[];
    }
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

      const registeredScope = this.graph.registeredParameters[scope];

      if (
        registeredScope === undefined ||
        !(parameter.label in registeredScope)
      ) {
        throw new Error("Could not resolve contract from parameter");
      }

      contract = registeredScope[parameter.label] as
        | HardhatContract
        | ArtifactContract
        | DeployedContract;
    } else if (isCallable(contractFuture)) {
      contract = contractFuture;
    } else {
      throw new Error(
        `Not a callable future ${contractFuture.label} (${contractFuture.type})`
      );
    }

    DeploymentBuilder._addVertex(this.graph, {
      id: callFuture.vertexId,
      label: callFuture.label,
      type: "Call",
      contract,
      method: functionName,
      args: args ?? [],
      after: after ?? [],
      scopeAdded: this.scopes.getScopedLabel(),
    });

    return callFuture;
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

  public useSubgraph(
    subgraph: Subgraph,
    options?: UseSubgraphOptions
  ): FutureDict {
    const { result, virtualVertex } = this._useSubscope(subgraph, options);

    return { ...result, subgraph: virtualVertex };
  }

  public useModule(module: Module, options?: UseSubgraphOptions): ModuleDict {
    const moduleKey = `module:${module.name}`;

    if (this.moduleCache[moduleKey] !== undefined) {
      const moduleData = this.moduleCache[moduleKey];

      const newHash = hash(options ?? null);

      if (moduleData.optionsHash !== newHash) {
        throw new IgnitionError(
          "`useModule` cannot be invoked on the same module using different parameters"
        );
      }

      return this.moduleCache[moduleKey].result;
    }

    const { result, virtualVertex } = this._useSubscope(module, options);

    // type casting here so that typescript lets us validate against js users bypassing typeguards
    for (const future of Object.values(result)) {
      if (isCallable(future)) {
        continue;
      }

      throw new IgnitionError(
        `Cannot return Future of type "${future.type}" from a module`
      );
    }

    const moduleResult = { ...result, module: virtualVertex };

    const optionsHash = hash(options ?? null);

    this.moduleCache[moduleKey] = { result: moduleResult, optionsHash };

    return moduleResult;
  }

  private _createVirtualVertex(label: string): Virtual {
    const virtualFuture: Virtual = {
      vertexId: this._resolveNextId(),
      label,
      type: "virtual",
      _future: true,
    };

    const scopeLabel = this.scopes.getScopedLabel();

    const afterVertexFutures = [...this.graph.vertexes.values()]
      .filter((v) => v.scopeAdded === scopeLabel)
      .map(
        (v): DeploymentGraphFuture => ({
          vertexId: v.id,
          label: v.label,
          type: "virtual",
          _future: true,
        })
      );

    DeploymentBuilder._addVertex(this.graph, {
      id: virtualFuture.vertexId,
      label,
      type: "Virtual",
      after: afterVertexFutures,
      scopeAdded: scopeLabel,
    });

    return virtualFuture;
  }

  private _resolveNextId(): number {
    return this.idCounter++;
  }

  private static _addVertex(
    graph: DeploymentGraph,
    depNode: DeploymentGraphVertex
  ) {
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
      addEdge(graph.adjacencyList, {
        from: depNode.contract.vertexId,
        to: depNode.id,
      });

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

    if (depNode.type === "Virtual") {
      DeploymentBuilder._addEdgesBasedOn(
        Object.values(depNode.after),
        graph,
        depNode
      );
      return;
    }
  }

  private static _addEdgesBasedOn(
    args: InternalParamValue[],
    graph: DeploymentGraph,
    depNode: DeploymentGraphVertex
  ) {
    for (const arg of args) {
      if (
        typeof arg === "string" ||
        typeof arg === "number" ||
        typeof arg === "boolean"
      ) {
        continue;
      }

      if (isDependable(arg)) {
        addEdge(graph.adjacencyList, { from: arg.vertexId, to: depNode.id });
        continue;
      }

      if (isParameter(arg)) {
        const resolvedArg = DeploymentBuilder._resolveParameterFromScope(
          graph,
          arg
        );

        if (isDependable(resolvedArg)) {
          addEdge(graph.adjacencyList, {
            from: resolvedArg.vertexId,
            to: depNode.id,
          });
          continue;
        }

        continue;
      }
    }
  }

  private static _resolveParameterFromScope(
    graph: DeploymentGraph,
    param: RequiredParameter | OptionalParameter
  ) {
    const parametersFromScope = graph.registeredParameters[param.scope];

    if (parametersFromScope === undefined) {
      return param;
    }

    const scopeValue = parametersFromScope[param.label];

    if (param.subtype === "optional") {
      return scopeValue ?? param.defaultValue;
    }

    if (scopeValue === undefined) {
      return param;
    }

    return scopeValue;
  }

  private _useSubscope(
    subgraphOrModule: Subgraph | Module,
    options?: UseSubgraphOptions
  ) {
    const useModuleInvocationId = this.useSubgraphInvocationCounter++;
    const label = `${subgraphOrModule.name}:${useModuleInvocationId}`;

    this.scopes.push(label);
    const scopeLabel = this.scopes.getScopedLabel();

    if (options !== undefined && options.parameters !== undefined) {
      this.graph.registeredParameters[scopeLabel] = options.parameters;
    }

    const result = this._invokeAction(subgraphOrModule);

    const virtualVertex = this._createVirtualVertex(label);

    this.scopes.pop();

    return { result, virtualVertex };
  }

  private _invokeAction(subgraphOrModule: Subgraph | Module) {
    if (isSubgraph(subgraphOrModule)) {
      return subgraphOrModule.subgraphAction(this);
    }

    if (isModule(subgraphOrModule)) {
      return subgraphOrModule.moduleAction(this);
    }

    throw new Error("Unknown module type");
  }
}
