import assert from "assert";
import { inspect } from "util";

import { IgnitionValidationError } from "../../errors";
import { ArtifactType, SolidityParamsType } from "../stubs";
import {
  ArtifactContractDeploymentFuture,
  ArtifactLibraryDeploymentFuture,
  ContractFuture,
  IgnitionModule,
  IgnitionModuleResult,
  NamedContractCallFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
  NamedStaticCallFuture,
} from "../types/module";
import {
  CallOptions,
  ContractFromArtifactOptions,
  ContractOptions,
  IgnitionModuleBuilder,
  IgnitionModuleDefinition,
  LibraryFromArtifactOptions,
  LibraryOptions,
} from "../types/module-builder";

import {
  ArtifactContractDeploymentFutureImplementation,
  ArtifactLibraryDeploymentFutureImplementation,
  IgnitionModuleImplementation,
  NamedContractCallFutureImplementation,
  NamedContractDeploymentFutureImplementation,
  NamedLibraryDeploymentFutureImplementation,
  NamedStaticCallFutureImplementation,
} from "./module";
import { isFuture } from "./utils";

const STUB_MODULE_RESULTS = {
  [inspect.custom](): string {
    return "<Module being constructed - No results available yet>";
  },
};

/**
 * This class is in charge of turning `IgnitionModuleDefinition`s into
 * `IgnitionModule`s.
 *
 * Part of this class' responsibility is handling any concrete
 * value that's only present during deployment (e.g. chain id, accounts, and
 * module params).
 *
 * TODO: Add support for concrete values.
 */
export class ModuleConstructor {
  private _modules: Map<string, IgnitionModule> = new Map();

  public construct<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    moduleDefintion: IgnitionModuleDefinition<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >
  ): IgnitionModule<ModuleIdT, ContractNameT, IgnitionModuleResultsT> {
    const cachedModule = this._modules.get(moduleDefintion.id);
    if (cachedModule !== undefined) {
      // NOTE: This is actually unsafe, but we accept the risk.
      //  A different module could have been cached with this id, and that would lead
      //  to this method returning a module with a different type than that of its signature.
      return cachedModule as any;
    }

    const mod = new IgnitionModuleImplementation<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >(moduleDefintion.id, STUB_MODULE_RESULTS as any);

    (mod as any).results = moduleDefintion.moduleDefintionFunction(
      new IgnitionModuleBuilderImplementation(this, mod)
    );

    this._modules.set(moduleDefintion.id, mod);

    return mod;
  }
}

export class IgnitionModuleBuilderImplementation<
  ModuleIdT extends string,
  ResultsContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ResultsContractNameT>
> implements IgnitionModuleBuilder
{
  private _futureIds: Set<string>;

  constructor(
    private readonly _constructor: ModuleConstructor,
    private readonly _module: IgnitionModuleImplementation<
      ModuleIdT,
      ResultsContractNameT,
      IgnitionModuleResultsT
    >
  ) {
    this._futureIds = new Set<string>();
  }

  public contract<ContractNameT extends string>(
    contractName: ContractNameT,
    args: SolidityParamsType = [],
    options: ContractOptions = {}
  ): NamedContractDeploymentFuture<ContractNameT> {
    const id = options.id ?? contractName;
    const futureId = `${this._module.id}:${id}`;
    options.libraries ??= {};

    this._assertUniqueContractId(futureId);

    const future = new NamedContractDeploymentFutureImplementation(
      futureId,
      this._module,
      contractName,
      args,
      options.libraries
    );

    for (const arg of args.filter(isFuture)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of (options.after ?? []).filter(isFuture)) {
      future.dependencies.add(afterFuture);
    }

    for (const libraryFuture of Object.values(options.libraries).filter(
      isFuture
    )) {
      future.dependencies.add(libraryFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public contractFromArtifact(
    contractName: string,
    artifact: ArtifactType,
    args: SolidityParamsType = [],
    options: ContractFromArtifactOptions = {}
  ): ArtifactContractDeploymentFuture {
    const id = options.id ?? contractName;
    const futureId = `${this._module.id}:${id}`;
    options.libraries ??= {};

    this._assertUniqueArtifactContractId(futureId);

    const future = new ArtifactContractDeploymentFutureImplementation(
      futureId,
      this._module,
      contractName,
      args,
      artifact,
      options.libraries
    );

    this._module.futures.add(future);

    for (const arg of args.filter(isFuture)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of (options.after ?? []).filter(isFuture)) {
      future.dependencies.add(afterFuture);
    }

    for (const libraryFuture of Object.values(options.libraries).filter(
      isFuture
    )) {
      future.dependencies.add(libraryFuture);
    }

    return future;
  }

  public library<LibraryNameT extends string>(
    libraryName: LibraryNameT,
    options: LibraryOptions = {}
  ): NamedLibraryDeploymentFuture<LibraryNameT> {
    const id = options.id ?? libraryName;
    const futureId = `${this._module.id}:${id}`;
    options.libraries ??= {};

    this._assertUniqueLibraryId(futureId);

    const future = new NamedLibraryDeploymentFutureImplementation(
      futureId,
      this._module,
      libraryName,
      options.libraries
    );

    for (const afterFuture of (options.after ?? []).filter(isFuture)) {
      future.dependencies.add(afterFuture);
    }

    for (const libraryFuture of Object.values(options.libraries).filter(
      isFuture
    )) {
      future.dependencies.add(libraryFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public libraryFromArtifact(
    libraryName: string,
    artifact: ArtifactType,
    options: LibraryFromArtifactOptions = {}
  ): ArtifactLibraryDeploymentFuture {
    const id = options.id ?? libraryName;
    const futureId = `${this._module.id}:${id}`;
    options.libraries ??= {};

    this._assertUniqueArtifactLibraryId(futureId);

    const future = new ArtifactLibraryDeploymentFutureImplementation(
      futureId,
      this._module,
      libraryName,
      artifact,
      options.libraries
    );

    for (const afterFuture of (options.after ?? []).filter(isFuture)) {
      future.dependencies.add(afterFuture);
    }

    for (const libraryFuture of Object.values(options.libraries).filter(
      isFuture
    )) {
      future.dependencies.add(libraryFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public call<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: ContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args: SolidityParamsType = [],
    options: CallOptions = {}
  ): NamedContractCallFuture<ContractNameT, FunctionNameT> {
    const id = options.id ?? functionName;
    const futureId = `${this._module.id}:${contractFuture.contractName}#${id}`;

    this._assertUniqueCallId(futureId);

    const future = new NamedContractCallFutureImplementation(
      futureId,
      this._module,
      functionName,
      contractFuture,
      args
    );

    future.dependencies.add(contractFuture);

    for (const arg of args.filter(isFuture)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of (options.after ?? []).filter(isFuture)) {
      future.dependencies.add(afterFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public staticCall<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: ContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args: SolidityParamsType = [],
    options: CallOptions = {}
  ): NamedStaticCallFuture<ContractNameT, FunctionNameT> {
    const id = options.id ?? functionName;
    const futureId = `${this._module.id}:${contractFuture.contractName}#${id}`;

    this._assertUniqueStaticCallId(futureId);

    const future = new NamedStaticCallFutureImplementation(
      futureId,
      this._module,
      functionName,
      contractFuture,
      args
    );

    future.dependencies.add(contractFuture);

    for (const arg of args.filter(isFuture)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of (options.after ?? []).filter(isFuture)) {
      future.dependencies.add(afterFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public call<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: ContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args: SolidityParamsType = [],
    options: CallOptions = {}
  ): NamedContractCallFuture<ContractNameT, FunctionNameT> {
    const id = options.id ?? functionName;
    const futureId = `${this._module.id}:${contractFuture.contractName}:${id}`;

    this._assertUniqueContractId(futureId);

    const future = new NamedContractCallFutureImplementation(
      futureId,
      this._module,
      functionName,
      contractFuture,
      args
    );

    future.dependencies.add(contractFuture);

    for (const arg of args.filter(isFuture)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of (options.after ?? []).filter(isFuture)) {
      future.dependencies.add(afterFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public staticCall<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: ContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args: SolidityParamsType = [],
    options: CallOptions = {}
  ): NamedStaticCallFuture<ContractNameT, FunctionNameT> {
    const id = options.id ?? functionName;
    const futureId = `${this._module.id}:${contractFuture.contractName}:${id}`;

    this._assertUniqueContractId(futureId);

    const future = new NamedStaticCallFutureImplementation(
      futureId,
      this._module,
      functionName,
      contractFuture,
      args
    );

    future.dependencies.add(contractFuture);

    for (const arg of args.filter(isFuture)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of (options.after ?? []).filter(isFuture)) {
      future.dependencies.add(afterFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public useModule<
    SubmoduleModuleIdT extends string,
    SubmoduleContractNameT extends string,
    SubmoduleIgnitionModuleResultsT extends IgnitionModuleResult<SubmoduleContractNameT>
  >(
    submoduleDefinition: IgnitionModuleDefinition<
      SubmoduleModuleIdT,
      SubmoduleContractNameT,
      SubmoduleIgnitionModuleResultsT
    >
  ): SubmoduleIgnitionModuleResultsT {
    assert(
      submoduleDefinition !== undefined,
      "Trying to use `undefined` as submodule. Make sure you don't have a circular dependency of modules."
    );

    const submodule = this._constructor.construct(submoduleDefinition);

    // Some things that should be done here:
    //   - Keep track of the submodule
    //   - return the submodule's results
    //
    this._module.submodules.add(submodule);

    return submodule.results;
  }

  private _assertUniqueFutureId(
    futureId: string,
    message: string,
    func: (...[]: any[]) => any
  ) {
    if (this._futureIds.has(futureId)) {
      const validationError = new IgnitionValidationError(message);

      // Improve the stack trace to stop on module api level
      Error.captureStackTrace(validationError, func);

      throw validationError;
    }

    this._futureIds.add(futureId);
  }

  private _assertUniqueContractId(futureId: string) {
    return this._assertUniqueFutureId(
      futureId,
      `Duplicated id ${futureId} found in module ${this._module.id}, ensure the id passed is unique \`m.contract("MyContract", [], { id: "MyId"})\``,
      this.contract
    );
  }

  private _assertUniqueArtifactContractId(futureId: string) {
    return this._assertUniqueFutureId(
      futureId,
      `Duplicated id ${futureId} found in module ${this._module.id}, ensure the id passed is unique \`m.contractFromArtifact("MyContract", artifact, [], { id: "MyId"})\``,
      this.contractFromArtifact
    );
  }

  private _assertUniqueLibraryId(futureId: string) {
    return this._assertUniqueFutureId(
      futureId,
      `Duplicated id ${futureId} found in module ${this._module.id}, ensure the id passed is unique \`m.library("MyLibrary", { id: "MyId"})\``,
      this.library
    );
  }

  private _assertUniqueArtifactLibraryId(futureId: string) {
    return this._assertUniqueFutureId(
      futureId,
      `Duplicated id ${futureId} found in module ${this._module.id}, ensure the id passed is unique \`m.libraryFromArtifact("MyLibrary", artifact, { id: "MyId"})\``,
      this.libraryFromArtifact
    );
  }

  private _assertUniqueCallId(futureId: string) {
    return this._assertUniqueFutureId(
      futureId,
      `Duplicated id ${futureId} found in module ${this._module.id}, ensure the id passed is unique \`m.call(myContract, "myFunction", [], { id: "MyId"})\``,
      this.call
    );
  }

  private _assertUniqueStaticCallId(futureId: string) {
    return this._assertUniqueFutureId(
      futureId,
      `Duplicated id ${futureId} found in module ${this._module.id}, ensure the id passed is unique \`m.staticCall(myContract, "myFunction", [], { id: "MyId"})\``,
      this.staticCall
    );
  }
}
