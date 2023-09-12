import assert from "assert";
import { inspect } from "util";

import { IgnitionError, IgnitionValidationError } from "../errors";
import {
  isAccountRuntimeValue,
  isAddressResolvableFuture,
  isArtifactType,
  isCallableContractFuture,
  isContractFuture,
  isFuture,
  isModuleParameterRuntimeValue,
} from "../type-guards";
import { Artifact } from "../types/artifact";
import {
  AccountRuntimeValue,
  AddressResolvableFuture,
  ArgumentType,
  ArtifactContractAtFuture,
  ArtifactContractDeploymentFuture,
  ArtifactLibraryDeploymentFuture,
  CallableContractFuture,
  ContractFuture,
  FutureType,
  IgnitionModule,
  IgnitionModuleResult,
  ModuleParameterRuntimeValue,
  ModuleParameterType,
  ModuleParameters,
  NamedContractAtFuture,
  NamedContractCallFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
  NamedStaticCallFuture,
  ReadEventArgumentFuture,
  SendDataFuture,
} from "../types/module";
import {
  CallOptions,
  ContractAtOptions,
  ContractFromArtifactOptions,
  ContractOptions,
  IgnitionModuleBuilder,
  LibraryFromArtifactOptions,
  LibraryOptions,
  ReadEventArgumentOptions,
  SendDataOptions,
  StaticCallOptions,
} from "../types/module-builder";

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
  NamedLibraryDeploymentFutureImplementation,
  NamedStaticCallFutureImplementation,
  ReadEventArgumentFutureImplementation,
  SendDataFutureImplementation,
} from "./module";
import { resolveArgsToFutures } from "./utils";

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

  constructor(
    public readonly parameters: { [moduleId: string]: ModuleParameters } = {}
  ) {}

  public construct<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(moduleDefintion: {
    id: ModuleIdT;
    moduleDefintionFunction: (
      m: IgnitionModuleBuilder
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
        this.parameters[moduleDefintion.id]
      )
    );

    if ((mod as any).results instanceof Promise) {
      throw new IgnitionError(
        `The callback passed to 'buildModule' for ${moduleDefintion.id} returns a Promise; async callbacks are not allowed in 'buildModule'.`
      );
    }

    this._modules.set(moduleDefintion.id, mod);

    return mod;
  }
}

class IgnitionModuleBuilderImplementation<
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
    >,
    public readonly parameters: ModuleParameters = {}
  ) {
    this._futureIds = new Set<string>();
  }

  public getAccount(accountIndex: number): AccountRuntimeValue {
    return new AccountRuntimeValueImplementation(accountIndex);
  }

  public getParameter<ParamTypeT extends ModuleParameterType = any>(
    parameterName: string,
    defaultValue?: ParamTypeT
  ): ModuleParameterRuntimeValue<ParamTypeT> {
    return new ModuleParameterRuntimeValueImplementation(
      this._module.id,
      parameterName,
      defaultValue
    );
  }

  public contract<ContractNameT extends string>(
    contractName: ContractNameT,
    args: ArgumentType[] = [],
    options: ContractOptions = {}
  ): NamedContractDeploymentFuture<ContractNameT> {
    const id = options.id ?? contractName;
    const futureId = `${this._module.id}:${id}`;
    options.libraries ??= {};
    options.value ??= BigInt(0);

    /* validation start */
    this._assertValidId(options.id, this.contract);
    this._assertUniqueContractId(futureId);
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
      options.from
    );

    for (const arg of resolveArgsToFutures(args)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);
    }

    for (const libraryFuture of Object.values(options.libraries)) {
      future.dependencies.add(libraryFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public contractFromArtifact(
    contractName: string,
    artifact: Artifact,
    args: ArgumentType[] = [],
    options: ContractFromArtifactOptions = {}
  ): ArtifactContractDeploymentFuture {
    const id = options.id ?? contractName;
    const futureId = `${this._module.id}:${id}`;
    options.libraries ??= {};
    options.value ??= BigInt(0);

    /* validation start */
    this._assertValidId(options.id, this.contractFromArtifact);
    this._assertUniqueArtifactContractId(futureId);
    this._assertValidLibraries(options.libraries, this.contractFromArtifact);
    this._assertValidValue(options.value, this.contractFromArtifact);
    this._assertValidFrom(options.from, this.contractFromArtifact);
    this._assertValidArtifact(artifact, this.contractFromArtifact);
    /* validation end */

    const future = new ArtifactContractDeploymentFutureImplementation(
      futureId,
      this._module,
      contractName,
      args,
      artifact,
      options.libraries,
      options.value,
      options.from
    );

    this._module.futures.add(future);

    for (const arg of resolveArgsToFutures(args)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);
    }

    for (const libraryFuture of Object.values(options.libraries)) {
      future.dependencies.add(libraryFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public library<LibraryNameT extends string>(
    libraryName: LibraryNameT,
    options: LibraryOptions = {}
  ): NamedLibraryDeploymentFuture<LibraryNameT> {
    const id = options.id ?? libraryName;
    const futureId = `${this._module.id}:${id}`;
    options.libraries ??= {};

    /* validation start */
    this._assertValidId(options.id, this.library);
    this._assertUniqueLibraryId(futureId);
    this._assertValidLibraries(options.libraries, this.library);
    this._assertValidFrom(options.from, this.library);
    /* validation end */

    const future = new NamedLibraryDeploymentFutureImplementation(
      futureId,
      this._module,
      libraryName,
      options.libraries,
      options.from
    );

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);
    }

    for (const libraryFuture of Object.values(options.libraries)) {
      future.dependencies.add(libraryFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public libraryFromArtifact(
    libraryName: string,
    artifact: Artifact,
    options: LibraryFromArtifactOptions = {}
  ): ArtifactLibraryDeploymentFuture {
    const id = options.id ?? libraryName;
    const futureId = `${this._module.id}:${id}`;
    options.libraries ??= {};

    /* validation start */
    this._assertValidId(options.id, this.libraryFromArtifact);
    this._assertUniqueArtifactLibraryId(futureId);
    this._assertValidLibraries(options.libraries, this.libraryFromArtifact);
    this._assertValidFrom(options.from, this.libraryFromArtifact);
    this._assertValidArtifact(artifact, this.libraryFromArtifact);
    /* validation end */

    const future = new ArtifactLibraryDeploymentFutureImplementation(
      futureId,
      this._module,
      libraryName,
      artifact,
      options.libraries,
      options.from
    );

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);
    }

    for (const libraryFuture of Object.values(options.libraries)) {
      future.dependencies.add(libraryFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public call<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: CallableContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args: ArgumentType[] = [],
    options: CallOptions = {}
  ): NamedContractCallFuture<ContractNameT, FunctionNameT> {
    const id = options.id ?? functionName;
    const futureId = `${this._module.id}:${contractFuture.contractName}#${id}`;
    options.value ??= BigInt(0);

    /* validation start */
    this._assertValidId(options.id, this.call);
    this._assertUniqueCallId(futureId);
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
      options.from
    );

    future.dependencies.add(contractFuture);

    for (const arg of resolveArgsToFutures(args)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public staticCall<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: CallableContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args: ArgumentType[] = [],
    nameOrIndex: string | number = 0,
    options: StaticCallOptions = {}
  ): NamedStaticCallFuture<ContractNameT, FunctionNameT> {
    const id = options.id ?? functionName;
    const futureId = `${this._module.id}:${contractFuture.contractName}#${id}`;

    /* validation start */
    this._assertValidId(options.id, this.staticCall);
    this._assertUniqueStaticCallId(futureId);
    this._assertValidFrom(options.from, this.staticCall);
    this._assertValidCallableContract(contractFuture, this.staticCall);
    this._assertValidNameOrIndex(nameOrIndex, this.staticCall);
    /* validation end */

    const future = new NamedStaticCallFutureImplementation(
      futureId,
      this._module,
      functionName,
      contractFuture,
      args,
      nameOrIndex,
      options.from
    );

    future.dependencies.add(contractFuture);

    for (const arg of resolveArgsToFutures(args)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public contractAt<ContractNameT extends string>(
    contractName: ContractNameT,
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    options: ContractAtOptions = {}
  ): NamedContractAtFuture<ContractNameT> {
    const id = options.id ?? contractName;
    const futureId = `${this._module.id}:${id}`;

    /* validation start */
    this._assertValidId(options.id, this.contractAt);
    this._assertUniqueContractAtId(futureId);
    this._assertValidAddress(address, this.contractAt);
    /* validation end */

    const future = new NamedContractAtFutureImplementation(
      futureId,
      this._module,
      contractName,
      address
    );

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);
    }

    if (isFuture(address)) {
      future.dependencies.add(address);
    }

    this._module.futures.add(future);

    return future;
  }

  public contractAtFromArtifact(
    contractName: string,
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    artifact: Artifact,
    options: ContractAtOptions = {}
  ): ArtifactContractAtFuture {
    const id = options.id ?? contractName;
    const futureId = `${this._module.id}:${id}`;

    /* validation start */
    this._assertValidId(options.id, this.contractAtFromArtifact);
    this._assertUniqueContractAtFromArtifactId(futureId);
    this._assertValidAddress(address, this.contractAtFromArtifact);
    this._assertValidArtifact(artifact, this.contractAtFromArtifact);
    /* validation end */

    const future = new ArtifactContractAtFutureImplementation(
      futureId,
      this._module,
      contractName,
      address,
      artifact
    );

    for (const afterFuture of options.after ?? []) {
      future.dependencies.add(afterFuture);
    }

    if (isFuture(address)) {
      future.dependencies.add(address);
    }

    this._module.futures.add(future);

    return future;
  }

  public readEventArgument(
    futureToReadFrom:
      | NamedContractDeploymentFuture<string>
      | ArtifactContractDeploymentFuture
      | SendDataFuture
      | NamedContractCallFuture<string, string>,
    eventName: string,
    nameOrIndex: string | number,
    options: ReadEventArgumentOptions = {}
  ): ReadEventArgumentFuture {
    const eventIndex = options.eventIndex ?? 0;

    if (
      futureToReadFrom.type === FutureType.SEND_DATA &&
      options.emitter === undefined
    ) {
      throw new IgnitionValidationError(
        "`options.emitter` must be provided when reading an event from a SendDataFuture"
      );
    }

    const contractToReadFrom =
      "contract" in futureToReadFrom
        ? futureToReadFrom.contract
        : (futureToReadFrom as
            | ArtifactContractDeploymentFuture
            | NamedContractDeploymentFuture<string>);

    const emitter = options.emitter ?? contractToReadFrom;

    const id =
      options.id ??
      `${emitter.contractName}#${eventName}#${nameOrIndex}#${eventIndex}`;

    const futureId = `${this._module.id}:${id}`;

    /* validation start */
    this._assertValidId(options.id, this.readEventArgument);
    this._assertUniqueReadEventArgumentId(futureId);
    this._assertValidNameOrIndex(nameOrIndex, this.readEventArgument);
    /* validation end */

    const future = new ReadEventArgumentFutureImplementation(
      futureId,
      this._module,
      futureToReadFrom,
      eventName,
      nameOrIndex,
      emitter,
      eventIndex
    );

    future.dependencies.add(futureToReadFrom);
    if (options.emitter !== undefined) {
      future.dependencies.add(options.emitter);
    }

    this._module.futures.add(future);

    return future;
  }

  public send(
    id: string,
    to: string | AddressResolvableFuture | ModuleParameterRuntimeValue<string>,
    value?: bigint | ModuleParameterRuntimeValue<bigint>,
    data?: string,
    options: SendDataOptions = {}
  ): SendDataFuture {
    const futureId = `${this._module.id}:${options.id ?? id}`;
    const val = value ?? BigInt(0);

    /* validation start */
    this._assertUniqueSendId(futureId);
    this._assertValidAddress(to, this.send);
    this._assertValidValue(val, this.send);
    this._assertValidData(data, this.send);
    this._assertValidFrom(options.from, this.send);
    /* validation end */

    const future = new SendDataFutureImplementation(
      futureId,
      this._module,
      to,
      val,
      data,
      options.from
    );

    if (isFuture(to)) {
      future.dependencies.add(to);
    }

    for (const afterFuture of options.after ?? []) {
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
    ignitionSubmodule: IgnitionModule<
      SubmoduleModuleIdT,
      SubmoduleContractNameT,
      SubmoduleIgnitionModuleResultsT
    >
  ): SubmoduleIgnitionModuleResultsT {
    assert(
      ignitionSubmodule !== undefined,
      "Trying to use `undefined` as submodule. Make sure you don't have a circular dependency of modules."
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
    func: (...[]: any[]) => any
  ): never {
    const validationError = new IgnitionValidationError(message);

    // Improve the stack trace to stop on module api level
    Error.captureStackTrace(validationError, func);

    throw validationError;
  }

  private _assertValidId(id: string | undefined, func: (...[]: any[]) => any) {
    if (id === undefined) {
      return;
    }

    if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) {
      return;
    }

    this._throwErrorWithStackTrace(
      `The id "${id}" contains banned characters, ids can only contain alphanumerics, underscores or dashes`,
      func
    );
  }

  private _assertUniqueFutureId(
    futureId: string,
    message: string,
    func: (...[]: any[]) => any
  ) {
    if (this._futureIds.has(futureId)) {
      this._throwErrorWithStackTrace(message, func);
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

  private _assertUniqueContractAtId(futureId: string) {
    return this._assertUniqueFutureId(
      futureId,
      `Duplicated id ${futureId} found in module ${this._module.id}, ensure the id passed is unique \`m.contractAt("MyContract", "0x123...", artifact, { id: "MyId"})\``,
      this.contractAt
    );
  }

  private _assertUniqueContractAtFromArtifactId(futureId: string) {
    return this._assertUniqueFutureId(
      futureId,
      `Duplicated id ${futureId} found in module ${this._module.id}, ensure the id passed is unique \`m.contractAtFromArtifact("MyContract", "0x123...", { id: "MyId"})\``,
      this.contractAtFromArtifact
    );
  }

  private _assertUniqueReadEventArgumentId(futureId: string) {
    return this._assertUniqueFutureId(
      futureId,
      `Duplicated id ${futureId} found in module ${this._module.id}, ensure the id passed is unique \`m.readEventArgument(myContract, "MyEvent", "eventArg", { id: "MyId"})\``,
      this.readEventArgument
    );
  }

  private _assertUniqueSendId(futureId: string) {
    return this._assertUniqueFutureId(
      futureId,
      `Duplicated id ${futureId} found in module ${this._module.id}, ensure the id passed is unique \`m.send("MyId", "0xabcd")\``,
      this.send
    );
  }

  private _assertValidLibraries(
    libraries: Record<string, ContractFuture<string>>,
    func: (...[]: any[]) => any
  ) {
    for (const [libraryName, libraryFuture] of Object.entries(libraries)) {
      if (!isContractFuture(libraryFuture)) {
        this._throwErrorWithStackTrace(
          `Given library '${libraryName}' is not a valid Future`,
          func
        );
      }
    }
  }

  private _assertValidValue(
    value: bigint | ModuleParameterRuntimeValue<bigint> | any,
    func: (...[]: any[]) => any
  ) {
    if (!isModuleParameterRuntimeValue(value) && typeof value !== "bigint") {
      this._throwErrorWithStackTrace(
        `Given value option '${value}' is not a \`bigint\``,
        func
      );
    }
  }

  private _assertValidFrom(
    from: string | AccountRuntimeValue | undefined,
    func: (...[]: any[]) => any
  ) {
    if (
      !isAccountRuntimeValue(from) &&
      typeof from !== "string" &&
      from !== undefined
    ) {
      this._throwErrorWithStackTrace(
        `Invalid type for given option "from": ${typeof from}`,
        func
      );
    }
  }

  private _assertValidArtifact(
    artifact: Artifact,
    func: (...[]: any[]) => any
  ) {
    if (!isArtifactType(artifact)) {
      this._throwErrorWithStackTrace(`Invalid artifact given`, func);
    }
  }

  private _assertValidCallableContract(
    contract: CallableContractFuture<string>,
    func: (...[]: any[]) => any
  ) {
    if (!isCallableContractFuture(contract)) {
      this._throwErrorWithStackTrace(`Invalid contract given`, func);
    }
  }

  private _assertValidNameOrIndex(
    nameOrIndex: string | number,
    func: (...[]: any[]) => any
  ) {
    if (typeof nameOrIndex !== "string" && typeof nameOrIndex !== "number") {
      this._throwErrorWithStackTrace(`Invalid nameOrIndex given`, func);
    }
  }

  private _assertValidAddress(
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    func: (...[]: any[]) => any
  ) {
    if (
      typeof address !== "string" &&
      !isModuleParameterRuntimeValue(address) &&
      !isAddressResolvableFuture(address)
    ) {
      this._throwErrorWithStackTrace(`Invalid address given`, func);
    }
  }

  private _assertValidData(
    data: string | undefined,
    func: (...[]: any[]) => any
  ) {
    if (typeof data !== "string" && data !== undefined) {
      this._throwErrorWithStackTrace(`Invalid data given`, func);
    }
  }
}
