import type { Artifact } from "../types/artifact.js";
import type {
  AccountRuntimeValue,
  AddressResolvableFuture,
  ArgumentType,
  CallableContractFuture,
  ContractAtFuture,
  ContractCallFuture,
  ContractDeploymentFuture,
  ContractFuture,
  EncodeFunctionCallFuture,
  IgnitionModule,
  IgnitionModuleResult,
  LibraryDeploymentFuture,
  ModuleParameterRuntimeValue,
  ModuleParameterType,
  ModuleParameters,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactLibraryDeploymentFuture,
  ReadEventArgumentFuture,
  SendDataFuture,
  StaticCallFuture,
} from "../types/module.js";
import type {
  CallOptions,
  ContractAtOptions,
  ContractOptions,
  EncodeFunctionCallOptions,
  IgnitionModuleBuilder,
  LibraryOptions,
  ReadEventArgumentOptions,
  SendDataOptions,
  StaticCallOptions,
} from "../types/module-builder.js";

import { inspect } from "node:util";

import { IgnitionError } from "../errors.js";
import {
  isAccountRuntimeValue,
  isAddressResolvableFuture,
  isArtifactType,
  isCallableContractFuture,
  isContractFuture,
  isEncodeFunctionCallFuture,
  isFuture,
  isModuleParameterRuntimeValue,
  isNamedStaticCallFuture,
  isReadEventArgumentFuture,
} from "../type-guards.js";
import { FutureType } from "../types/module.js";

import { ERRORS } from "./errors-list.js";
import { equalAddresses, isAddress } from "./execution/utils/address.js";
import {
  AccountRuntimeValueImplementation,
  ArtifactContractAtFutureImplementation,
  ArtifactContractDeploymentFutureImplementation,
  ArtifactLibraryDeploymentFutureImplementation,
  IgnitionModuleImplementation,
  ModuleParameterRuntimeValueImplementation,
  NamedContractAtFutureImplementation,
  NamedContractCallFutureImplementation,
  NamedContractDeploymentFutureImplementation,
  NamedEncodeFunctionCallFutureImplementation,
  NamedLibraryDeploymentFutureImplementation,
  NamedStaticCallFutureImplementation,
  ReadEventArgumentFutureImplementation,
  SendDataFutureImplementation,
} from "./module.js";
import { resolveArgsToFutures } from "./utils.js";
import { assertIgnitionInvariant } from "./utils/assertions.js";
import {
  toCallFutureId,
  toContractFutureId,
  toEncodeFunctionCallFutureId,
  toReadEventArgumentFutureId,
  toSendDataFutureId,
} from "./utils/future-id-builders.js";
import {
  isValidContractName,
  isValidFunctionOrEventName,
  isValidIgnitionIdentifier,
  isValidSolidityIdentifier,
} from "./utils/identifier-validators.js";

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
  private readonly _modules: Map<string, IgnitionModule> = new Map();

  constructor(
    public readonly parameters: { [moduleId: string]: ModuleParameters } = {},
  ) {}

  public construct<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>,
  >(moduleDefintion: {
    id: ModuleIdT;
    moduleDefintionFunction: (
      m: IgnitionModuleBuilder,
    ) => IgnitionModuleResultsT;
  }): IgnitionModule<ModuleIdT, ContractNameT, IgnitionModuleResultsT> {
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
      new IgnitionModuleBuilderImplementation(
        this,
        mod,
        this.parameters[moduleDefintion.id],
      ),
    );

    if ((mod as any).results instanceof Promise) {
      throw new IgnitionError(ERRORS.MODULE.ASYNC_MODULE_DEFINITION_FUNCTION, {
        moduleDefinitionId: moduleDefintion.id,
      });
    }

    this._modules.set(moduleDefintion.id, mod);

    return mod;
  }
}

class IgnitionModuleBuilderImplementation<
  ModuleIdT extends string,
  ResultsContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ResultsContractNameT>,
> implements IgnitionModuleBuilder
{
  private readonly _futureIds: Set<string>;

  constructor(
    private readonly _constructor: ModuleConstructor,
    private readonly _module: IgnitionModuleImplementation<
      ModuleIdT,
      ResultsContractNameT,
      IgnitionModuleResultsT
    >,
    public readonly parameters: ModuleParameters = {},
  ) {
    this._futureIds = new Set<string>();
  }

  public getAccount(accountIndex: number): AccountRuntimeValue {
    if (typeof accountIndex !== "number") {
      this._throwErrorWithStackTrace(
        `Account index must be a number, received ${typeof accountIndex}`,
        this.getAccount,
      );
    }

    return new AccountRuntimeValueImplementation(accountIndex);
  }

  public getParameter<ParamTypeT extends ModuleParameterType = any>(
    parameterName: string,
    defaultValue?: ParamTypeT,
  ): ModuleParameterRuntimeValue<ParamTypeT> {
    if (typeof parameterName !== "string") {
      this._throwErrorWithStackTrace(
        `Parameter name must be a string, received ${typeof parameterName}`,
        this.getParameter,
      );
    }

    return new ModuleParameterRuntimeValueImplementation(
      this._module.id,
      parameterName,
      defaultValue,
    );
  }

  public contract<ContractNameT extends string>(
    contractName: ContractNameT,
    args?: ArgumentType[],
    options?: ContractOptions,
  ): NamedArtifactContractDeploymentFuture<ContractNameT>;
  public contract(
    contractName: string,
    artifact: Artifact,
    args?: ArgumentType[],
    options?: ContractOptions,
  ): ContractDeploymentFuture;
  public contract<ContractNameT extends string>(
    contractName: ContractNameT,
    artifactOrArgs?: Artifact | ArgumentType[],
    argsorOptions?: ArgumentType[] | ContractAtOptions,
    maybeOptions?: ContractOptions,
  ):
    | NamedArtifactContractDeploymentFuture<ContractNameT>
    | ContractDeploymentFuture {
    if (typeof contractName !== "string") {
      this._throwErrorWithStackTrace(
        `Contract name must be a string, received ${typeof contractName}`,
        this.contract,
      );
    }

    if (artifactOrArgs === undefined || Array.isArray(artifactOrArgs)) {
      if (Array.isArray(argsorOptions)) {
        this._throwErrorWithStackTrace(
          `Invalid parameter "options" provided to contract "${contractName}" in module "${this._module.id}"`,
          this.contract,
        );
      }

      return this._namedArtifactContract(
        contractName,
        artifactOrArgs,
        argsorOptions,
      );
    }

    if (argsorOptions !== undefined && !Array.isArray(argsorOptions)) {
      this._throwErrorWithStackTrace(
        `Invalid parameter "args" provided to contract "${contractName}" in module "${this._module.id}"`,
        this.contract,
      );
    }

    return this._contractFromArtifact(
      contractName,
      artifactOrArgs,
      argsorOptions,
      maybeOptions,
    );
  }

  private _namedArtifactContract<ContractNameT extends string>(
    contractName: ContractNameT,
    args: ArgumentType[] = [],
    options: ContractOptions = {},
  ): NamedArtifactContractDeploymentFuture<ContractNameT> {
    const futureId = toContractFutureId(
      this._module.id,
      options.id,
      contractName,
    );

    options.libraries ??= {};
    options.value ??= BigInt(0);

    /* validation start */
    this._assertValidId(options.id, this.contract);
    this._assertValidContractName(contractName, this.contract);
    this._assertUniqueFutureId(futureId, options.id, this.contract);
    this._assertValidLibraries(options.libraries, this.contract);
    this._assertValidValue(options.value, this.contract);
    this._assertValidFrom(options.from, this.contract);
    /* validation end */

    const future = new NamedContractDeploymentFutureImplementation(
      futureId,
      this._module,
      contractName,
      args,
      options.libraries,
      options.value,
      options.from,
    );

    if (isFuture(options.value)) {
      future.dependencies.add(options.value);
    }

    for (const arg of resolveArgsToFutures(args)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);

      if (!isFuture(afterFuture)) {
        this._module.submodules.add(afterFuture);
      }
    }

    for (const libraryFuture of Object.values(options.libraries)) {
      future.dependencies.add(libraryFuture);
    }

    this._module.futures.add(future);
    this._futureIds.add(futureId);

    return future;
  }

  private _contractFromArtifact(
    contractName: string,
    artifact: Artifact,
    args: ArgumentType[] = [],
    options: ContractOptions = {},
  ): ContractDeploymentFuture {
    const futureId = toContractFutureId(
      this._module.id,
      options.id,
      contractName,
    );
    options.libraries ??= {};
    options.value ??= BigInt(0);

    /* validation start */
    this._assertValidId(options.id, this.contract);
    this._assertValidContractName(contractName, this.contract);
    this._assertUniqueFutureId(futureId, options.id, this.contract);
    this._assertValidLibraries(options.libraries, this.contract);
    this._assertValidValue(options.value, this.contract);
    this._assertValidFrom(options.from, this.contract);
    this._assertValidArtifact(artifact, this.contract);
    /* validation end */

    const future = new ArtifactContractDeploymentFutureImplementation(
      futureId,
      this._module,
      contractName,
      args,
      artifact,
      options.libraries,
      options.value,
      options.from,
    );

    if (isFuture(options.value)) {
      future.dependencies.add(options.value);
    }

    for (const arg of resolveArgsToFutures(args)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);

      if (!isFuture(afterFuture)) {
        this._module.submodules.add(afterFuture);
      }
    }

    for (const libraryFuture of Object.values(options.libraries)) {
      future.dependencies.add(libraryFuture);
    }

    this._module.futures.add(future);
    this._futureIds.add(futureId);

    return future;
  }

  public library<LibraryNameT extends string>(
    libraryName: LibraryNameT,
    options?: LibraryOptions,
  ): NamedArtifactLibraryDeploymentFuture<LibraryNameT>;
  public library(
    libraryName: string,
    artifact: Artifact,
    options?: LibraryOptions,
  ): LibraryDeploymentFuture;
  public library<LibraryNameT extends string>(
    libraryName: LibraryNameT,
    artifactOrOptions?: Artifact | LibraryOptions,
    options?: LibraryOptions,
  ) {
    if (typeof libraryName !== "string") {
      this._throwErrorWithStackTrace(
        `Library name must be a string, received ${typeof libraryName}`,
        this.library,
      );
    }

    if (isArtifactType(artifactOrOptions)) {
      return this._libraryFromArtifact(libraryName, artifactOrOptions, options);
    }

    return this._namedArtifactLibrary(libraryName, artifactOrOptions);
  }

  private _namedArtifactLibrary<LibraryNameT extends string>(
    libraryName: LibraryNameT,
    options: LibraryOptions = {},
  ): NamedArtifactLibraryDeploymentFuture<LibraryNameT> {
    const futureId = toContractFutureId(
      this._module.id,
      options.id,
      libraryName,
    );

    options.libraries ??= {};

    /* validation start */
    this._assertValidId(options.id, this.library);
    this._assertValidContractName(libraryName, this.library);
    this._assertUniqueFutureId(futureId, options.id, this.library);
    this._assertValidLibraries(options.libraries, this.library);
    this._assertValidFrom(options.from, this.library);
    /* validation end */

    const future = new NamedLibraryDeploymentFutureImplementation(
      futureId,
      this._module,
      libraryName,
      options.libraries,
      options.from,
    );

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);

      if (!isFuture(afterFuture)) {
        this._module.submodules.add(afterFuture);
      }
    }

    for (const libraryFuture of Object.values(options.libraries)) {
      future.dependencies.add(libraryFuture);
    }

    this._module.futures.add(future);
    this._futureIds.add(futureId);

    return future;
  }

  private _libraryFromArtifact(
    libraryName: string,
    artifact: Artifact,
    options: LibraryOptions = {},
  ): LibraryDeploymentFuture {
    const futureId = toContractFutureId(
      this._module.id,
      options.id,
      libraryName,
    );
    options.libraries ??= {};

    /* validation start */
    this._assertValidId(options.id, this.library);
    this._assertValidContractName(libraryName, this.library);
    this._assertUniqueFutureId(futureId, options.id, this.library);
    this._assertValidLibraries(options.libraries, this.library);
    this._assertValidFrom(options.from, this.library);
    this._assertValidArtifact(artifact, this.library);
    /* validation end */

    const future = new ArtifactLibraryDeploymentFutureImplementation(
      futureId,
      this._module,
      libraryName,
      artifact,
      options.libraries,
      options.from,
    );

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);

      if (!isFuture(afterFuture)) {
        this._module.submodules.add(afterFuture);
      }
    }

    for (const libraryFuture of Object.values(options.libraries)) {
      future.dependencies.add(libraryFuture);
    }

    this._module.futures.add(future);
    this._futureIds.add(futureId);

    return future;
  }

  public call<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: CallableContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args: ArgumentType[] = [],
    options: CallOptions = {},
  ): ContractCallFuture<ContractNameT, FunctionNameT> {
    if (!Array.isArray(args)) {
      this._throwErrorWithStackTrace(
        `Invalid parameter "args" provided to call "${functionName}" in module "${this._module.id}"`,
        this.call,
      );
    }

    if (typeof options !== "object") {
      this._throwErrorWithStackTrace(
        `Invalid parameter "options" provided to call "${functionName}" in module "${this._module.id}"`,
        this.call,
      );
    }

    const futureId = toCallFutureId(
      this._module.id,
      options.id,
      contractFuture.module.id,
      contractFuture.id,
      functionName,
    );

    options.value ??= BigInt(0);

    /* validation start */
    this._assertValidId(options.id, this.call);
    this._assertValidFunctionName(functionName, this.call);
    this._assertUniqueFutureId(futureId, options.id, this.call);
    this._assertValidValue(options.value, this.call);
    this._assertValidFrom(options.from, this.call);
    this._assertValidCallableContract(contractFuture, this.call);
    /* validation end */

    const future = new NamedContractCallFutureImplementation(
      futureId,
      this._module,
      functionName,
      contractFuture,
      args,
      options.value,
      options.from,
    );

    future.dependencies.add(contractFuture);

    if (isFuture(options.value)) {
      future.dependencies.add(options.value);
    }

    for (const arg of resolveArgsToFutures(args)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);

      if (!isFuture(afterFuture)) {
        this._module.submodules.add(afterFuture);
      }
    }

    this._module.futures.add(future);
    this._futureIds.add(futureId);

    return future;
  }

  public staticCall<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: CallableContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args: ArgumentType[] = [],
    nameOrIndex: string | number = 0,
    options: StaticCallOptions = {},
  ): StaticCallFuture<ContractNameT, FunctionNameT> {
    if (!Array.isArray(args)) {
      this._throwErrorWithStackTrace(
        `Invalid parameter "args" provided to staticCall "${functionName}" in module "${this._module.id}"`,
        this.staticCall,
      );
    }

    if (typeof options !== "object") {
      this._throwErrorWithStackTrace(
        `Invalid parameter "options" provided to staticCall "${functionName}" in module "${this._module.id}"`,
        this.staticCall,
      );
    }

    const futureId = toCallFutureId(
      this._module.id,
      options.id,
      contractFuture.module.id,
      contractFuture.id,
      functionName,
    );

    /* validation start */
    this._assertValidId(options.id, this.staticCall);
    this._assertValidFunctionName(functionName, this.staticCall);
    this._assertValidNameOrIndex(nameOrIndex, this.staticCall);
    this._assertUniqueFutureId(futureId, options.id, this.staticCall);
    this._assertValidFrom(options.from, this.staticCall);
    this._assertValidCallableContract(contractFuture, this.staticCall);
    /* validation end */

    const future = new NamedStaticCallFutureImplementation(
      futureId,
      this._module,
      functionName,
      contractFuture,
      args,
      nameOrIndex,
      options.from,
    );

    future.dependencies.add(contractFuture);

    for (const arg of resolveArgsToFutures(args)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);

      if (!isFuture(afterFuture)) {
        this._module.submodules.add(afterFuture);
      }
    }

    this._module.futures.add(future);
    this._futureIds.add(futureId);

    return future;
  }

  public encodeFunctionCall<
    ContractNameT extends string,
    FunctionNameT extends string,
  >(
    contractFuture: CallableContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args: ArgumentType[] = [],
    options: EncodeFunctionCallOptions = {},
  ): EncodeFunctionCallFuture<ContractNameT, FunctionNameT> {
    if (!Array.isArray(args)) {
      this._throwErrorWithStackTrace(
        `Invalid parameter "args" provided to encodeFunctionCall "${functionName}" in module "${this._module.id}"`,
        this.encodeFunctionCall,
      );
    }

    if (typeof options !== "object") {
      this._throwErrorWithStackTrace(
        `Invalid parameter "options" provided to encodeFunctionCall "${functionName}" in module "${this._module.id}"`,
        this.encodeFunctionCall,
      );
    }

    const futureId = toEncodeFunctionCallFutureId(
      this._module.id,
      options.id,
      contractFuture.module.id,
      contractFuture.id,
      functionName,
    );

    /* validation start */
    this._assertValidId(options.id, this.encodeFunctionCall);
    this._assertValidFunctionName(functionName, this.encodeFunctionCall);
    this._assertUniqueFutureId(futureId, options.id, this.encodeFunctionCall);
    this._assertValidCallableContract(contractFuture, this.encodeFunctionCall);
    /* validation end */

    const future = new NamedEncodeFunctionCallFutureImplementation(
      futureId,
      this._module,
      functionName,
      contractFuture,
      args,
    );

    future.dependencies.add(contractFuture);

    for (const arg of resolveArgsToFutures(args)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);

      if (!isFuture(afterFuture)) {
        this._module.submodules.add(afterFuture);
      }
    }

    this._module.futures.add(future);
    this._futureIds.add(futureId);

    return future;
  }

  public contractAt<ContractNameT extends string>(
    contractName: ContractNameT,
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    options?: ContractAtOptions,
  ): NamedArtifactContractAtFuture<ContractNameT>;
  public contractAt(
    contractName: string,
    artifact: Artifact,
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    options?: ContractAtOptions,
  ): ContractAtFuture;
  public contractAt<ContractNameT extends string>(
    contractName: ContractNameT,
    addressOrArtifact:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>
      | Artifact,
    optionsOrAddress?:
      | ContractAtOptions
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    options?: ContractAtOptions,
  ) {
    if (typeof contractName !== "string") {
      this._throwErrorWithStackTrace(
        `Contract name must be a string, received ${typeof contractName}`,
        this.contractAt,
      );
    }

    if (isArtifactType(addressOrArtifact)) {
      if (
        !(
          typeof optionsOrAddress === "string" ||
          isFuture(optionsOrAddress) ||
          isModuleParameterRuntimeValue(optionsOrAddress)
        )
      ) {
        this._throwErrorWithStackTrace(
          `Invalid parameter "address" provided to contractAt "${contractName}" in module "${this._module.id}"`,
          this.contractAt,
        );
      }

      return this._contractAtFromArtifact(
        contractName,
        addressOrArtifact,
        optionsOrAddress,
        options,
      );
    }

    return this._namedArtifactContractAt(
      contractName,
      addressOrArtifact,
      optionsOrAddress as ContractAtOptions,
    );
  }

  private _namedArtifactContractAt<ContractNameT extends string>(
    contractName: ContractNameT,
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    options: ContractAtOptions = {},
  ): NamedArtifactContractAtFuture<ContractNameT> {
    const futureId = toContractFutureId(
      this._module.id,
      options.id,
      contractName,
    );

    /* validation start */
    this._assertValidId(options.id, this.contractAt);
    this._assertValidContractName(contractName, this.contractAt);
    this._assertUniqueFutureId(futureId, options.id, this.contractAt);
    this._assertValidAddress(address, this.contractAt);
    /* validation end */

    const future = new NamedContractAtFutureImplementation(
      futureId,
      this._module,
      contractName,
      address,
    );

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);

      if (!isFuture(afterFuture)) {
        this._module.submodules.add(afterFuture);
      }
    }

    if (isFuture(address)) {
      future.dependencies.add(address);
    }

    this._module.futures.add(future);
    this._futureIds.add(futureId);

    return future;
  }

  private _contractAtFromArtifact(
    contractName: string,
    artifact: Artifact,
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    options: ContractAtOptions = {},
  ): ContractAtFuture {
    const futureId = toContractFutureId(
      this._module.id,
      options.id,
      contractName,
    );

    /* validation start */
    this._assertValidId(options.id, this.contractAt);
    this._assertValidContractName(contractName, this.contractAt);
    this._assertUniqueFutureId(futureId, options.id, this.contractAt);
    this._assertValidAddress(address, this.contractAt);
    this._assertValidArtifact(artifact, this.contractAt);
    /* validation end */

    const future = new ArtifactContractAtFutureImplementation(
      futureId,
      this._module,
      contractName,
      address,
      artifact,
    );

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);

      if (!isFuture(afterFuture)) {
        this._module.submodules.add(afterFuture);
      }
    }

    if (isFuture(address)) {
      future.dependencies.add(address);
    }

    this._module.futures.add(future);
    this._futureIds.add(futureId);

    return future;
  }

  public readEventArgument(
    futureToReadFrom:
      | NamedArtifactContractDeploymentFuture<string>
      | ContractDeploymentFuture
      | SendDataFuture
      | ContractCallFuture<string, string>,
    eventName: string,
    nameOrIndex: string | number,
    options: ReadEventArgumentOptions = {},
  ): ReadEventArgumentFuture {
    if (typeof options !== "object") {
      this._throwErrorWithStackTrace(
        `Invalid parameter "options" provided to readEventArgument "${eventName}" in module "${this._module.id}"`,
        this.readEventArgument,
      );
    }

    const eventIndex = options.eventIndex ?? 0;

    if (
      futureToReadFrom.type === FutureType.SEND_DATA &&
      options.emitter === undefined
    ) {
      throw new IgnitionError(ERRORS.VALIDATION.MISSING_EMITTER);
    }

    const contractToReadFrom =
      "contract" in futureToReadFrom
        ? futureToReadFrom.contract
        : (futureToReadFrom as
            | ContractDeploymentFuture
            | NamedArtifactContractDeploymentFuture<string>);

    const emitter = options.emitter ?? contractToReadFrom;

    const futureId = toReadEventArgumentFutureId(
      this._module.id,
      options.id,
      emitter.contractName,
      eventName,
      nameOrIndex,
      eventIndex,
    );

    /* validation start */
    this._assertValidId(options.id, this.readEventArgument);
    this._assertValidEventName(eventName, this.readEventArgument);
    this._assertValidNameOrIndex(nameOrIndex, this.readEventArgument);
    this._assertUniqueFutureId(futureId, options.id, this.readEventArgument);
    /* validation end */

    const future = new ReadEventArgumentFutureImplementation(
      futureId,
      this._module,
      futureToReadFrom,
      eventName,
      nameOrIndex,
      emitter,
      eventIndex,
    );

    future.dependencies.add(futureToReadFrom);
    if (options.emitter !== undefined) {
      future.dependencies.add(options.emitter);
    }

    this._module.futures.add(future);
    this._futureIds.add(futureId);

    return future;
  }

  public send(
    id: string,
    to:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>
      | AccountRuntimeValue,
    value?: bigint | ModuleParameterRuntimeValue<bigint>,
    data?: string | EncodeFunctionCallFuture<string, string>,
    options: SendDataOptions = {},
  ): SendDataFuture {
    if (typeof options !== "object") {
      this._throwErrorWithStackTrace(
        `Invalid parameter "options" provided to send "${id}" in module "${this._module.id}"`,
        this.send,
      );
    }

    const futureId = toSendDataFutureId(this._module.id, id);
    const val = value ?? BigInt(0);

    /* validation start */
    this._assertValidId(id, this.send);
    this._assertUniqueFutureId(futureId, id, this.send);
    this._assertValidAddress(to, this.send);
    this._assertValidValue(val, this.send);
    this._assertValidData(data, this.send);
    this._assertValidFrom(options.from, this.send);
    this._assertUniqueToAndFrom(to, options.from, this.send);
    /* validation end */

    const future = new SendDataFutureImplementation(
      futureId,
      this._module,
      to,
      val,
      data,
      options.from,
    );

    if (isFuture(to)) {
      future.dependencies.add(to);
    }

    if (isFuture(data)) {
      future.dependencies.add(data);
    }

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);

      if (!isFuture(afterFuture)) {
        this._module.submodules.add(afterFuture);
      }
    }

    this._module.futures.add(future);
    this._futureIds.add(futureId);

    return future;
  }

  public useModule<
    SubmoduleModuleIdT extends string,
    SubmoduleContractNameT extends string,
    SubmoduleIgnitionModuleResultsT extends
      IgnitionModuleResult<SubmoduleContractNameT>,
  >(
    ignitionSubmodule: IgnitionModule<
      SubmoduleModuleIdT,
      SubmoduleContractNameT,
      SubmoduleIgnitionModuleResultsT
    >,
  ): SubmoduleIgnitionModuleResultsT {
    assertIgnitionInvariant(
      ignitionSubmodule !== undefined,
      "Trying to use `undefined` as submodule. Make sure you don't have a circular dependency of modules.",
    );

    // Some things that should be done here:
    //   - Keep track of the submodule
    //   - return the submodule's results
    //
    this._module.submodules.add(ignitionSubmodule);

    return ignitionSubmodule.results;
  }

  private _throwErrorWithStackTrace(
    message: string,
    func: (...[]: any[]) => any,
  ): never {
    const validationError = new IgnitionError(
      ERRORS.VALIDATION.INVALID_MODULE,
      { message },
    );

    // Improve the stack trace to stop on module api level
    Error.captureStackTrace(validationError, func);

    throw validationError;
  }

  private _assertValidId(id: string | undefined, func: (...[]: any[]) => any) {
    if (id === undefined) {
      return;
    }

    if (isValidIgnitionIdentifier(id)) {
      return;
    }

    this._throwErrorWithStackTrace(
      `The id "${id}" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character.`,
      func,
    );
  }

  private _assertValidContractName(
    contractName: string,
    func: (...[]: any[]) => any,
  ) {
    if (isValidContractName(contractName)) {
      return;
    }

    this._throwErrorWithStackTrace(
      `The contract name "${contractName}" is invalid.`,
      func,
    );
  }

  private _assertValidEventName(
    eventName: string,
    func: (...[]: any[]) => any,
  ) {
    if (isValidFunctionOrEventName(eventName)) {
      return;
    }

    this._throwErrorWithStackTrace(
      `The event name "${eventName}" is invalid, make sure you use a valid identifier.`,
      func,
    );
  }

  private _assertValidFunctionName(
    functionName: string,
    func: (...[]: any[]) => any,
  ) {
    if (isValidFunctionOrEventName(functionName)) {
      return;
    }

    this._throwErrorWithStackTrace(
      `The function name "${functionName}" is invalid, make sure you use a valid identifier.`,
      func,
    );
  }

  private _assertUniqueFutureId(
    futureId: string,
    userProvidedId: string | undefined,
    futureConstructor: (...[]: any[]) => any,
  ) {
    if (!this._futureIds.has(futureId)) {
      return;
    }

    if (userProvidedId !== undefined) {
      this._throwErrorWithStackTrace(
        `The future id "${userProvidedId}" is already used, please provide a different one.`,
        futureConstructor,
      );
    }

    this._throwErrorWithStackTrace(
      `The autogenerated future id ("${futureId}") is already used. Please provide a unique id, as shown below:

m.${futureConstructor.name}(..., { id: "MyUniqueId"})`,
      futureConstructor,
    );
  }

  private _assertValidLibraries(
    libraries: Record<string, ContractFuture<string>>,
    func: (...[]: any[]) => any,
  ) {
    for (const [libraryName, libraryFuture] of Object.entries(libraries)) {
      if (!isContractFuture(libraryFuture)) {
        this._throwErrorWithStackTrace(
          `The value you provided for the library '${libraryName}' is not a valid Future or it doesn't represent a contract`,
          func,
        );
      }
    }
  }

  private _assertValidValue(
    value:
      | bigint
      | ModuleParameterRuntimeValue<bigint>
      | StaticCallFuture<string, string>
      | ReadEventArgumentFuture
      | any,
    func: (...[]: any[]) => any,
  ) {
    if (
      !isReadEventArgumentFuture(value) &&
      !isNamedStaticCallFuture(value) &&
      !isModuleParameterRuntimeValue(value) &&
      typeof value !== "bigint"
    ) {
      this._throwErrorWithStackTrace(
        `Invalid option "value" received. It should be a bigint, a module parameter, or a value obtained from an event or static call.`,
        func,
      );
    }
  }

  private _assertValidFrom(
    from: string | AccountRuntimeValue | undefined,
    func: (...[]: any[]) => any,
  ) {
    if (
      !isAccountRuntimeValue(from) &&
      typeof from !== "string" &&
      from !== undefined
    ) {
      this._throwErrorWithStackTrace(
        `Invalid type for option "from": ${typeof from}`,
        func,
      );
    }
  }

  private _assertValidArtifact(
    artifact: Artifact,
    func: (...[]: any[]) => any,
  ) {
    if (isArtifactType(artifact)) {
      return;
    }

    this._throwErrorWithStackTrace(`Invalid artifact given`, func);
  }

  private _assertValidCallableContract(
    contract: CallableContractFuture<string>,
    func: (...[]: any[]) => any,
  ) {
    if (isCallableContractFuture(contract)) {
      return;
    }

    this._throwErrorWithStackTrace(`Invalid contract given`, func);
  }

  private _assertValidNameOrIndex(
    nameOrIndex: string | number,
    func: (...[]: any[]) => any,
  ) {
    if (typeof nameOrIndex !== "string" && typeof nameOrIndex !== "number") {
      this._throwErrorWithStackTrace(`Invalid nameOrIndex given`, func);
    }

    if (typeof nameOrIndex === "number") {
      return;
    }

    if (isValidSolidityIdentifier(nameOrIndex)) {
      return;
    }

    this._throwErrorWithStackTrace(
      `The argument "${nameOrIndex}" is expected to have a valid name, but it's invalid.`,
      func,
    );
  }

  private _assertValidAddress(
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>
      | AccountRuntimeValue,
    func: (...[]: any[]) => any,
  ) {
    if (typeof address === "string" && !isAddress(address)) {
      return this._throwErrorWithStackTrace(`Invalid address given`, func);
    }

    if (
      typeof address !== "string" &&
      !isModuleParameterRuntimeValue(address) &&
      !isAccountRuntimeValue(address) &&
      !isAddressResolvableFuture(address)
    ) {
      return this._throwErrorWithStackTrace(`Invalid address given`, func);
    }
  }

  private _assertValidData(
    data: string | EncodeFunctionCallFuture<string, string> | undefined,
    func: (...[]: any[]) => any,
  ) {
    if (
      typeof data !== "string" &&
      data !== undefined &&
      !isEncodeFunctionCallFuture(data)
    ) {
      this._throwErrorWithStackTrace(`Invalid data given`, func);
    }
  }

  private _assertUniqueToAndFrom(
    to:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>
      | AccountRuntimeValue,
    from: string | AccountRuntimeValue | undefined,
    func: (...[]: any[]) => any,
  ) {
    if (
      typeof to === "string" &&
      typeof from === "string" &&
      equalAddresses(to, from)
    ) {
      this._throwErrorWithStackTrace(
        `The "to" and "from" addresses are the same`,
        func,
      );
    } else if (
      isAccountRuntimeValue(to) &&
      isAccountRuntimeValue(from) &&
      to.accountIndex === from.accountIndex
    ) {
      this._throwErrorWithStackTrace(
        `The "to" and "from" addresses are the same`,
        func,
      );
    }
  }
}
