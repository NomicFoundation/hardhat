import type { Graph } from "./internal/topological-order.js";
import type {
  AccountRuntimeValue,
  AddressResolvableFuture,
  ArgumentType,
  ContractCallFuture,
  ContractDeploymentFuture,
  ContractFuture,
  EncodeFunctionCallFuture,
  Future,
  IgnitionModule,
  IgnitionModuleResult,
  ModuleParameterRuntimeValue,
  ModuleParameterType,
  NamedArtifactContractDeploymentFuture,
  ReadEventArgumentFuture,
  StaticCallFuture,
} from "./types/module.js";
import type {
  FutureToken,
  ModuleToken,
  SerializedAccountRuntimeValue,
  SerializedArgumentType,
  SerializedArtifactContractAtFuture,
  SerializedArtifactContractDeploymentFuture,
  SerializedArtifactLibraryDeploymentFuture,
  SerializedBigInt,
  SerializedFuture,
  SerializedIgnitionModule,
  SerializedLibraries,
  SerializedModuleDescription,
  SerializedModuleParameterRuntimeValue,
  SerializedNamedContractAtFuture,
  SerializedNamedContractCallFuture,
  SerializedNamedContractDeploymentFuture,
  SerializedNamedEncodeFunctionCallFuture,
  SerializedNamedLibraryDeploymentFuture,
  SerializedNamedStaticCallFuture,
  SerializedReadEventArgumentFuture,
  SerializedSendDataFuture,
} from "./types/serialization.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

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
} from "./internal/module.js";
import { getNodesInTopologicalOrder } from "./internal/topological-order.js";
import { replaceWithinArg } from "./internal/utils/replace-within-arg.js";
import {
  isAccountRuntimeValue,
  isAddressResolvableFuture,
  isContractFuture,
  isEncodeFunctionCallFuture,
  isFuture,
  isModuleParameterRuntimeValue,
  isRuntimeValue,
} from "./type-guards.js";
import { FutureType, RuntimeValueType } from "./types/module.js";

interface SerializeContext {
  argReplacer: (arg: ArgumentType) => SerializedArgumentType;
}

/**
 * Serialize an Ignition module.
 *
 * @beta
 */
export class IgnitionModuleSerializer {
  public static serialize(
    ignitionModule: IgnitionModule<
      string,
      string,
      IgnitionModuleResult<string>
    >,
  ): SerializedIgnitionModule {
    const argReplacer = (arg: ArgumentType) =>
      replaceWithinArg<SerializedArgumentType>(arg, {
        accountRuntimeValue: this._serializeAccountRuntimeValue,
        moduleParameterRuntimeValue: (mprv) =>
          this._serializeModuleParamterRuntimeValue(mprv),
        bigint: this._serializeBigint,
        future: this._convertFutureToFutureToken,
      });

    const allModules = this._getModulesAndSubmoduleFor(ignitionModule);

    return {
      startModule: ignitionModule.id,
      modules: Object.fromEntries(
        allModules.map((m) => [
          m.id,
          this._serializeModule(m, { argReplacer }),
        ]),
      ),
    };
  }

  private static _serializeModule(
    userModule: IgnitionModule<string, string, IgnitionModuleResult<string>>,
    context: SerializeContext,
  ): SerializedModuleDescription {
    return {
      id: userModule.id,
      futures: Array.from(userModule.futures).map((future) =>
        this._serializeFuture(future, context),
      ),
      submodules: Array.from(userModule.submodules).map(
        this._convertModuleToModuleToken,
      ),
      results: Object.entries(userModule.results).map(([key, future]) => [
        key,
        this._convertFutureToFutureToken(future),
      ]),
    };
  }

  private static _serializeFuture(
    future: Future,
    context: SerializeContext,
  ): SerializedFuture {
    switch (future.type) {
      case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
        const serializedNamedContractDeploymentFuture: SerializedNamedContractDeploymentFuture =
          {
            id: future.id,
            moduleId: future.module.id,
            type: future.type,
            dependencies: Array.from(future.dependencies).map((d) =>
              isFuture(d)
                ? this._convertFutureToFutureToken(d)
                : this._convertModuleToModuleToken(d),
            ),
            contractName: future.contractName,
            constructorArgs: future.constructorArgs.map((arg) =>
              context.argReplacer(arg),
            ),
            from: isRuntimeValue(future.from)
              ? this._serializeAccountRuntimeValue(future.from)
              : future.from,
            libraries: this._convertLibrariesToLibraryTokens(future.libraries),
            value: isFuture(future.value)
              ? this._convertFutureToFutureToken(future.value)
              : isRuntimeValue(future.value)
                ? this._serializeModuleParamterRuntimeValue(future.value)
                : this._serializeBigint(future.value),
          };
        return serializedNamedContractDeploymentFuture;

      case FutureType.CONTRACT_DEPLOYMENT:
        const serializedArtifactContractDeploymentFuture: SerializedArtifactContractDeploymentFuture =
          {
            id: future.id,
            moduleId: future.module.id,
            type: future.type,
            dependencies: Array.from(future.dependencies).map((d) =>
              isFuture(d)
                ? this._convertFutureToFutureToken(d)
                : this._convertModuleToModuleToken(d),
            ),
            contractName: future.contractName,
            artifact: future.artifact,
            constructorArgs: future.constructorArgs.map((arg) =>
              context.argReplacer(arg),
            ),
            from: isRuntimeValue(future.from)
              ? this._serializeAccountRuntimeValue(future.from)
              : future.from,
            libraries: this._convertLibrariesToLibraryTokens(future.libraries),
            value: isFuture(future.value)
              ? this._convertFutureToFutureToken(future.value)
              : isRuntimeValue(future.value)
                ? this._serializeModuleParamterRuntimeValue(future.value)
                : this._serializeBigint(future.value),
          };
        return serializedArtifactContractDeploymentFuture;

      case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
        const serializedNamedLibraryDeploymentFuture: SerializedNamedLibraryDeploymentFuture =
          {
            id: future.id,
            moduleId: future.module.id,
            type: future.type,
            dependencies: Array.from(future.dependencies).map((d) =>
              isFuture(d)
                ? this._convertFutureToFutureToken(d)
                : this._convertModuleToModuleToken(d),
            ),
            contractName: future.contractName,
            from: isRuntimeValue(future.from)
              ? this._serializeAccountRuntimeValue(future.from)
              : future.from,
            libraries: this._convertLibrariesToLibraryTokens(future.libraries),
          };
        return serializedNamedLibraryDeploymentFuture;

      case FutureType.LIBRARY_DEPLOYMENT:
        const serializedArtifactLibraryDeploymentFuture: SerializedArtifactLibraryDeploymentFuture =
          {
            id: future.id,
            moduleId: future.module.id,
            type: future.type,
            dependencies: Array.from(future.dependencies).map((d) =>
              isFuture(d)
                ? this._convertFutureToFutureToken(d)
                : this._convertModuleToModuleToken(d),
            ),
            contractName: future.contractName,
            artifact: future.artifact,
            from: isRuntimeValue(future.from)
              ? this._serializeAccountRuntimeValue(future.from)
              : future.from,
            libraries: this._convertLibrariesToLibraryTokens(future.libraries),
          };
        return serializedArtifactLibraryDeploymentFuture;

      case FutureType.CONTRACT_CALL:
        const serializedNamedContractCallFuture: SerializedNamedContractCallFuture =
          {
            id: future.id,
            moduleId: future.module.id,
            type: future.type,
            dependencies: Array.from(future.dependencies).map((d) =>
              isFuture(d)
                ? this._convertFutureToFutureToken(d)
                : this._convertModuleToModuleToken(d),
            ),
            contract: this._convertFutureToFutureToken(future.contract),
            functionName: future.functionName,
            args: future.args.map((arg) => context.argReplacer(arg)),
            value: isFuture(future.value)
              ? this._convertFutureToFutureToken(future.value)
              : isRuntimeValue(future.value)
                ? this._serializeModuleParamterRuntimeValue(future.value)
                : this._serializeBigint(future.value),
            from: isRuntimeValue(future.from)
              ? this._serializeAccountRuntimeValue(future.from)
              : future.from,
          };
        return serializedNamedContractCallFuture;

      case FutureType.STATIC_CALL:
        const serializedNamedStaticCallFuture: SerializedNamedStaticCallFuture =
          {
            id: future.id,
            moduleId: future.module.id,
            type: future.type,
            dependencies: Array.from(future.dependencies).map((d) =>
              isFuture(d)
                ? this._convertFutureToFutureToken(d)
                : this._convertModuleToModuleToken(d),
            ),
            contract: this._convertFutureToFutureToken(future.contract),
            functionName: future.functionName,
            args: future.args.map((arg) => context.argReplacer(arg)),
            nameOrIndex: future.nameOrIndex,
            from: isRuntimeValue(future.from)
              ? this._serializeAccountRuntimeValue(future.from)
              : future.from,
          };
        return serializedNamedStaticCallFuture;

      case FutureType.ENCODE_FUNCTION_CALL:
        const serializedEncodeFunctionCallFuture: SerializedNamedEncodeFunctionCallFuture =
          {
            id: future.id,
            moduleId: future.module.id,
            type: future.type,
            dependencies: Array.from(future.dependencies).map((d) =>
              isFuture(d)
                ? this._convertFutureToFutureToken(d)
                : this._convertModuleToModuleToken(d),
            ),
            contract: this._convertFutureToFutureToken(future.contract),
            functionName: future.functionName,
            args: future.args.map((arg) => context.argReplacer(arg)),
          };
        return serializedEncodeFunctionCallFuture;

      case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
        const serializedNamedContractAtFuture: SerializedNamedContractAtFuture =
          {
            id: future.id,
            moduleId: future.module.id,
            type: future.type,
            dependencies: Array.from(future.dependencies).map((d) =>
              isFuture(d)
                ? this._convertFutureToFutureToken(d)
                : this._convertModuleToModuleToken(d),
            ),
            contractName: future.contractName,
            address: isFuture(future.address)
              ? this._convertFutureToFutureToken(future.address)
              : isRuntimeValue(future.address) &&
                  future.address.type === RuntimeValueType.MODULE_PARAMETER
                ? this._serializeModuleParamterRuntimeValue(future.address)
                : future.address,
          };
        return serializedNamedContractAtFuture;

      case FutureType.CONTRACT_AT:
        const serializedArtifactContractAtFuture: SerializedArtifactContractAtFuture =
          {
            id: future.id,
            moduleId: future.module.id,
            type: future.type,
            dependencies: Array.from(future.dependencies).map((d) =>
              isFuture(d)
                ? this._convertFutureToFutureToken(d)
                : this._convertModuleToModuleToken(d),
            ),
            contractName: future.contractName,
            artifact: future.artifact,
            address: isFuture(future.address)
              ? this._convertFutureToFutureToken(future.address)
              : isRuntimeValue(future.address) &&
                  future.address.type === RuntimeValueType.MODULE_PARAMETER
                ? this._serializeModuleParamterRuntimeValue(future.address)
                : future.address,
          };
        return serializedArtifactContractAtFuture;

      case FutureType.READ_EVENT_ARGUMENT:
        const serializedReadEventArgumentFuture: SerializedReadEventArgumentFuture =
          {
            id: future.id,
            moduleId: future.module.id,
            type: future.type,
            dependencies: Array.from(future.dependencies).map((d) =>
              isFuture(d)
                ? this._convertFutureToFutureToken(d)
                : this._convertModuleToModuleToken(d),
            ),
            futureToReadFrom: this._convertFutureToFutureToken(
              future.futureToReadFrom,
            ),
            emitter: this._convertFutureToFutureToken(future.emitter),
            eventName: future.eventName,
            nameOrIndex: future.nameOrIndex,
            eventIndex: future.eventIndex,
          };
        return serializedReadEventArgumentFuture;

      case FutureType.SEND_DATA:
        const serializedSendDataFuture: SerializedSendDataFuture = {
          id: future.id,
          moduleId: future.module.id,
          type: future.type,
          dependencies: Array.from(future.dependencies).map((d) =>
            isFuture(d)
              ? this._convertFutureToFutureToken(d)
              : this._convertModuleToModuleToken(d),
          ),
          to: isFuture(future.to)
            ? this._convertFutureToFutureToken(future.to)
            : isModuleParameterRuntimeValue(future.to)
              ? this._serializeModuleParamterRuntimeValue(future.to)
              : isAccountRuntimeValue(future.to)
                ? this._serializeAccountRuntimeValue(future.to)
                : future.to,
          value: isRuntimeValue(future.value)
            ? this._serializeModuleParamterRuntimeValue(future.value)
            : this._serializeBigint(future.value),
          data: isEncodeFunctionCallFuture(future.data)
            ? this._convertFutureToFutureToken(future.data)
            : future.data,
          from: isRuntimeValue(future.from)
            ? this._serializeAccountRuntimeValue(future.from)
            : future.from,
        };
        return serializedSendDataFuture;
    }
  }

  private static _convertLibrariesToLibraryTokens(
    libraries: Record<string, ContractFuture<string>>,
  ): SerializedLibraries {
    return Object.entries(libraries).map(([key, lib]) => [
      key,
      this._convertFutureToFutureToken(lib),
    ]);
  }

  private static _serializeAccountRuntimeValue(
    arg: AccountRuntimeValue,
  ): SerializedAccountRuntimeValue {
    return { _kind: "AccountRuntimeValue", accountIndex: arg.accountIndex };
  }

  private static _serializeModuleParamterRuntimeValue(
    arg: ModuleParameterRuntimeValue<ModuleParameterType>,
  ): SerializedModuleParameterRuntimeValue {
    return {
      _kind: "ModuleParameterRuntimeValue",
      moduleId: arg.moduleId,
      name: arg.name,
      defaultValue:
        arg.defaultValue === undefined
          ? undefined
          : this._jsonStringifyWithBigint(arg.defaultValue),
    };
  }

  private static _serializeBigint(n: bigint): SerializedBigInt {
    return { _kind: "bigint", value: n.toString(10) };
  }

  private static _jsonStringifyWithBigint(value: unknown, prettyPrint = true) {
    return JSON.stringify(
      value,
      (_: string, v: any) =>
        typeof v === "bigint" ? this._serializeBigint(v) : v,
      prettyPrint ? 2 : undefined,
    );
  }

  private static _convertFutureToFutureToken(future: Future): FutureToken {
    return {
      futureId: future.id,
      _kind: "FutureToken",
    };
  }

  private static _convertModuleToModuleToken(
    m: IgnitionModule<string, string, IgnitionModuleResult<string>>,
  ): ModuleToken {
    return {
      moduleId: m.id,
      _kind: "ModuleToken",
    };
  }

  private static _getModulesAndSubmoduleFor(
    module: IgnitionModule<string, string, IgnitionModuleResult<string>>,
  ): Array<IgnitionModule<string, string, IgnitionModuleResult<string>>> {
    return [module].concat(
      Array.from(module.submodules).flatMap((sm) =>
        this._getModulesAndSubmoduleFor(sm),
      ),
    );
  }
}

/**
 * Deserialize an `IgnitionModule` that was previously serialized using
 * IgnitionModuleSerializer.
 *
 * @beta
 */
export class IgnitionModuleDeserializer {
  public static deserialize(
    serializedIgnitionModule: SerializedIgnitionModule,
  ): IgnitionModule<string, string, IgnitionModuleResult<string>> {
    const sortedModules = this._getSerializedModulesInReverseTopologicalOrder(
      serializedIgnitionModule,
    );

    const modulesLookup: Map<string, IgnitionModuleImplementation> = new Map();
    for (const serializedModule of sortedModules) {
      const mod = new IgnitionModuleImplementation(serializedModule.id, {});
      modulesLookup.set(mod.id, mod);

      for (const submoduleToken of serializedModule.submodules) {
        const submodule = this._lookup(modulesLookup, submoduleToken.moduleId);
        mod.submodules.add(submodule);
      }
    }

    const sortedFutures = this._getSerializedFuturesInReverseTopologicalOrder(
      serializedIgnitionModule,
    );

    const futuresLookup: Map<string, Future> = new Map();
    const contractFuturesLookup: Map<
      string,
      ContractFuture<string>
    > = new Map();
    const addressResolvableFutureLookup: Map<string, AddressResolvableFuture> =
      new Map();

    for (const serializedFuture of sortedFutures) {
      const future = this._deserializeFuture(
        serializedFuture,
        modulesLookup,
        futuresLookup,
        contractFuturesLookup,
        addressResolvableFutureLookup,
      );

      for (const dependencyId of serializedFuture.dependencies) {
        let dependency: Future | IgnitionModule;

        if (dependencyId._kind === "FutureToken") {
          dependency = this._lookup(futuresLookup, dependencyId.futureId);
        } else {
          dependency = this._lookup(modulesLookup, dependencyId.moduleId);
        }

        future.dependencies.add(dependency);
      }

      futuresLookup.set(future.id, future);

      if (isContractFuture(future)) {
        contractFuturesLookup.set(future.id, future);
      }

      if (isAddressResolvableFuture(future)) {
        addressResolvableFutureLookup.set(future.id, future);
      }
    }

    for (const serializedModule of Object.values(
      serializedIgnitionModule.modules,
    )) {
      const mod = this._lookup(modulesLookup, serializedModule.id);

      for (const [name, futureToken] of serializedModule.results) {
        const contract = this._lookup(
          contractFuturesLookup,
          futureToken.futureId,
        );

        mod.results[name] = contract;
      }

      // Add futures to the module in the original order
      for (const futureToken of serializedModule.futures) {
        mod.futures.add(this._lookup(futuresLookup, futureToken.id));
      }
    }

    return this._lookup(modulesLookup, serializedIgnitionModule.startModule);
  }

  private static _getSerializedModulesInReverseTopologicalOrder(
    serializedIgnitionModule: SerializedIgnitionModule,
  ): SerializedModuleDescription[] {
    const graph: Graph<SerializedModuleDescription> = new Map();

    for (const mod of Object.values(serializedIgnitionModule.modules)) {
      graph.set(mod, new Set());
    }

    for (const mod of Object.values(serializedIgnitionModule.modules)) {
      for (const submodToken of mod.submodules) {
        const submod = serializedIgnitionModule.modules[submodToken.moduleId];
        graph.get(submod)!.add(mod);
      }
    }

    return getNodesInTopologicalOrder(graph);
  }

  private static _getSerializedFuturesInReverseTopologicalOrder(
    serializedIgnitionModule: SerializedIgnitionModule,
  ): SerializedFuture[] {
    const serializedFutures = this._getAllFuturesFor(serializedIgnitionModule);
    const serializedFuturesMap = Object.fromEntries(
      serializedFutures.map((f) => [f.id, f]),
    );

    const graph: Graph<SerializedFuture> = new Map();

    for (const serializedFuture of serializedFutures) {
      graph.set(serializedFuture, new Set());
    }

    for (const serializedFuture of serializedFutures) {
      for (const dependencyToken of serializedFuture.dependencies) {
        if (dependencyToken._kind === "FutureToken") {
          const dependency = serializedFuturesMap[dependencyToken.futureId];
          graph.get(dependency)!.add(serializedFuture);
        }
      }
    }

    return getNodesInTopologicalOrder(graph);
  }

  private static _deserializeArgument(
    arg: SerializedArgumentType,
    futureLookup: Map<string, Future>,
  ): ArgumentType {
    if (this._isSerializedFutureToken(arg)) {
      const swappedFuture = this._lookup(futureLookup, arg.futureId);

      if (swappedFuture === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.IGNITION.SERIALIZATION.INVALID_FUTURE_ID,
          {
            futureId: arg.futureId,
          },
        );
      }

      if (
        swappedFuture.type === FutureType.CONTRACT_CALL ||
        swappedFuture.type === FutureType.SEND_DATA
      ) {
        throw new HardhatError(
          HardhatError.ERRORS.IGNITION.SERIALIZATION.INVALID_FUTURE_TYPE,
          {
            type: FutureType[swappedFuture.type],
          },
        );
      }

      return swappedFuture;
    }

    if (this._isSerializedAccountRuntimeValue(arg)) {
      return this._deserializeAccountRuntimeValue(arg);
    }

    if (this._isSerializedModuleParameterRuntimeValue(arg)) {
      return this._deserializeModuleParameterRuntimeValue(arg);
    }

    if (this._isSerializedBigInt(arg)) {
      return this._deserializedBigint(arg);
    }

    if (Array.isArray(arg)) {
      return arg.map((a) => this._deserializeArgument(a, futureLookup));
    }

    if (typeof arg === "object" && arg !== null) {
      return Object.fromEntries(
        Object.entries(arg).map(([k, v]) => [
          k,
          this._deserializeArgument(v, futureLookup),
        ]),
      );
    }

    return arg;
  }

  private static _deserializedBigint(n: SerializedBigInt): bigint {
    return BigInt(n.value);
  }

  private static _jsonParseWithBigint(jsonString: string): unknown {
    return JSON.parse(jsonString, (k, v) => {
      if (this._isSerializedBigInt(v)) {
        return this._deserializedBigint(v);
      }

      return v;
    });
  }

  private static _isSerializedFutureToken(
    arg: SerializedArgumentType,
  ): arg is FutureToken {
    return (
      typeof arg === "object" && "_kind" in arg && arg._kind === "FutureToken"
    );
  }

  private static _isSerializedBigInt(
    arg: SerializedArgumentType,
  ): arg is SerializedBigInt {
    return typeof arg === "object" && "_kind" in arg && arg._kind === "bigint";
  }

  private static _getAllFuturesFor(
    deployment: SerializedIgnitionModule,
  ): SerializedFuture[] {
    return Object.values(deployment.modules).flatMap((m) =>
      Object.values(m.futures),
    );
  }

  private static _deserializeFuture(
    serializedFuture: SerializedFuture,
    modulesLookup: Map<
      string,
      IgnitionModuleImplementation<string, string, IgnitionModuleResult<string>>
    >,
    futuresLookup: Map<string, Future>,
    contractFuturesLookup: Map<string, ContractFuture<string>>,
    addressResolvableFutureLookup: Map<string, AddressResolvableFuture>,
  ): Future {
    const mod = this._lookup(modulesLookup, serializedFuture.moduleId);

    switch (serializedFuture.type) {
      case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
        return new NamedContractDeploymentFutureImplementation(
          serializedFuture.id,
          mod,
          serializedFuture.contractName,
          serializedFuture.constructorArgs.map((arg) =>
            this._deserializeArgument(arg, futuresLookup),
          ),
          Object.fromEntries(
            serializedFuture.libraries.map(([name, lib]) => [
              name,
              this._lookup(contractFuturesLookup, lib.futureId),
            ]),
          ),
          this._isSerializedFutureToken(serializedFuture.value)
            ? (this._lookup(futuresLookup, serializedFuture.value.futureId) as
                | StaticCallFuture<string, string>
                | ReadEventArgumentFuture)
            : this._isSerializedModuleParameterRuntimeValue(
                  serializedFuture.value,
                )
              ? (this._deserializeModuleParameterRuntimeValue(
                  serializedFuture.value,
                ) as ModuleParameterRuntimeValue<bigint>) // This is unsafe, but we only serialize valid values
              : this._deserializedBigint(serializedFuture.value),
          this._isSerializedAccountRuntimeValue(serializedFuture.from)
            ? this._deserializeAccountRuntimeValue(serializedFuture.from)
            : serializedFuture.from,
        );
      case FutureType.CONTRACT_DEPLOYMENT:
        return new ArtifactContractDeploymentFutureImplementation(
          serializedFuture.id,
          mod,
          serializedFuture.contractName,
          serializedFuture.constructorArgs.map((arg) =>
            this._deserializeArgument(arg, futuresLookup),
          ),
          serializedFuture.artifact,
          Object.fromEntries(
            serializedFuture.libraries.map(([name, lib]) => [
              name,
              this._lookup(contractFuturesLookup, lib.futureId),
            ]),
          ),
          this._isSerializedFutureToken(serializedFuture.value)
            ? (this._lookup(futuresLookup, serializedFuture.value.futureId) as
                | StaticCallFuture<string, string>
                | ReadEventArgumentFuture)
            : this._isSerializedModuleParameterRuntimeValue(
                  serializedFuture.value,
                )
              ? (this._deserializeModuleParameterRuntimeValue(
                  serializedFuture.value,
                ) as ModuleParameterRuntimeValue<bigint>) // This is unsafe, but we only serialize valid values
              : this._deserializedBigint(serializedFuture.value),
          this._isSerializedAccountRuntimeValue(serializedFuture.from)
            ? this._deserializeAccountRuntimeValue(serializedFuture.from)
            : serializedFuture.from,
        );
      case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
        return new NamedLibraryDeploymentFutureImplementation(
          serializedFuture.id,
          mod,
          serializedFuture.contractName,
          Object.fromEntries(
            serializedFuture.libraries.map(([name, lib]) => [
              name,
              this._lookup(contractFuturesLookup, lib.futureId),
            ]),
          ),
          this._isSerializedAccountRuntimeValue(serializedFuture.from)
            ? this._deserializeAccountRuntimeValue(serializedFuture.from)
            : serializedFuture.from,
        );
      case FutureType.LIBRARY_DEPLOYMENT:
        return new ArtifactLibraryDeploymentFutureImplementation(
          serializedFuture.id,
          mod,
          serializedFuture.contractName,
          serializedFuture.artifact,
          Object.fromEntries(
            serializedFuture.libraries.map(([name, lib]) => [
              name,
              this._lookup(contractFuturesLookup, lib.futureId),
            ]),
          ),
          this._isSerializedAccountRuntimeValue(serializedFuture.from)
            ? this._deserializeAccountRuntimeValue(serializedFuture.from)
            : serializedFuture.from,
        );
      case FutureType.CONTRACT_CALL:
        return new NamedContractCallFutureImplementation(
          serializedFuture.id,
          mod,
          serializedFuture.functionName,
          this._lookup(
            contractFuturesLookup,
            serializedFuture.contract.futureId,
          ),
          serializedFuture.args.map((arg) =>
            this._deserializeArgument(arg, futuresLookup),
          ),
          this._isSerializedFutureToken(serializedFuture.value)
            ? (this._lookup(futuresLookup, serializedFuture.value.futureId) as
                | StaticCallFuture<string, string>
                | ReadEventArgumentFuture)
            : this._isSerializedModuleParameterRuntimeValue(
                  serializedFuture.value,
                )
              ? (this._deserializeModuleParameterRuntimeValue(
                  serializedFuture.value,
                ) as ModuleParameterRuntimeValue<bigint>) // This is unsafe, but we only serialize valid values
              : this._deserializedBigint(serializedFuture.value),
          this._isSerializedAccountRuntimeValue(serializedFuture.from)
            ? this._deserializeAccountRuntimeValue(serializedFuture.from)
            : serializedFuture.from,
        );
      case FutureType.STATIC_CALL:
        return new NamedStaticCallFutureImplementation(
          serializedFuture.id,
          mod,
          serializedFuture.functionName,
          this._lookup(
            contractFuturesLookup,
            serializedFuture.contract.futureId,
          ),
          serializedFuture.args.map((arg) =>
            this._deserializeArgument(arg, futuresLookup),
          ),
          serializedFuture.nameOrIndex,
          this._isSerializedAccountRuntimeValue(serializedFuture.from)
            ? this._deserializeAccountRuntimeValue(serializedFuture.from)
            : serializedFuture.from,
        );
      case FutureType.ENCODE_FUNCTION_CALL:
        return new NamedEncodeFunctionCallFutureImplementation(
          serializedFuture.id,
          mod,
          serializedFuture.functionName,
          this._lookup(
            contractFuturesLookup,
            serializedFuture.contract.futureId,
          ),
          serializedFuture.args.map((arg) =>
            this._deserializeArgument(arg, futuresLookup),
          ),
        );
      case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
        return new NamedContractAtFutureImplementation(
          serializedFuture.id,
          mod,
          serializedFuture.contractName,
          this._isSerializedFutureToken(serializedFuture.address)
            ? this._lookup(
                addressResolvableFutureLookup,
                serializedFuture.address.futureId,
              )
            : this._isSerializedModuleParameterRuntimeValue(
                  serializedFuture.address,
                )
              ? (this._deserializeModuleParameterRuntimeValue(
                  serializedFuture.address,
                ) as ModuleParameterRuntimeValue<string>) // This is unsafe, but we only serialize valid values
              : serializedFuture.address,
        );
      case FutureType.CONTRACT_AT:
        return new ArtifactContractAtFutureImplementation(
          serializedFuture.id,
          mod,
          serializedFuture.contractName,
          this._isSerializedFutureToken(serializedFuture.address)
            ? this._lookup(
                addressResolvableFutureLookup,
                serializedFuture.address.futureId,
              )
            : this._isSerializedModuleParameterRuntimeValue(
                  serializedFuture.address,
                )
              ? (this._deserializeModuleParameterRuntimeValue(
                  serializedFuture.address,
                ) as ModuleParameterRuntimeValue<string>) // This is unsafe, but we only serialize valid values
              : serializedFuture.address,
          serializedFuture.artifact,
        );
      case FutureType.READ_EVENT_ARGUMENT:
        return new ReadEventArgumentFutureImplementation(
          serializedFuture.id,
          mod,
          this._lookup(
            futuresLookup,
            serializedFuture.futureToReadFrom.futureId,
          ) as
            | NamedArtifactContractDeploymentFuture<string>
            | ContractDeploymentFuture
            | ContractCallFuture<string, string>,
          serializedFuture.eventName,
          serializedFuture.nameOrIndex,
          this._lookup(
            contractFuturesLookup,
            serializedFuture.emitter.futureId,
          ),
          serializedFuture.eventIndex,
        );
      case FutureType.SEND_DATA:
        return new SendDataFutureImplementation(
          serializedFuture.id,
          mod,
          this._isSerializedFutureToken(serializedFuture.to)
            ? this._lookup(
                addressResolvableFutureLookup,
                serializedFuture.to.futureId,
              )
            : this._isSerializedModuleParameterRuntimeValue(serializedFuture.to)
              ? (this._deserializeModuleParameterRuntimeValue(
                  serializedFuture.to,
                ) as ModuleParameterRuntimeValue<string>) // This is unsafe, but we only serialize valid values
              : this._isSerializedAccountRuntimeValue(serializedFuture.to)
                ? this._deserializeAccountRuntimeValue(serializedFuture.to)
                : serializedFuture.to,
          this._isSerializedModuleParameterRuntimeValue(serializedFuture.value)
            ? (this._deserializeModuleParameterRuntimeValue(
                serializedFuture.value,
              ) as ModuleParameterRuntimeValue<bigint>) // This is unsafe, but we only serialize valid values
            : this._deserializedBigint(serializedFuture.value),
          serializedFuture.data === undefined ||
          typeof serializedFuture.data === "string"
            ? serializedFuture.data
            : (this._lookup(
                futuresLookup,
                serializedFuture.data.futureId,
              ) as EncodeFunctionCallFuture<string, string>),
          this._isSerializedAccountRuntimeValue(serializedFuture.from)
            ? this._deserializeAccountRuntimeValue(serializedFuture.from)
            : serializedFuture.from,
        );
    }
  }

  private static _lookup<T>(lookupTable: Map<string, T>, key: string): T {
    const value = lookupTable.get(key);

    if (value === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.SERIALIZATION.LOOKAHEAD_NOT_FOUND,
        {
          key,
        },
      );
    }

    return value;
  }

  private static _isSerializedAccountRuntimeValue(
    v: unknown,
  ): v is SerializedAccountRuntimeValue {
    return (
      v instanceof Object && "_kind" in v && v._kind === "AccountRuntimeValue"
    );
  }

  private static _deserializeAccountRuntimeValue(
    serialized: SerializedAccountRuntimeValue,
  ): AccountRuntimeValue {
    return new AccountRuntimeValueImplementation(serialized.accountIndex);
  }

  private static _isSerializedModuleParameterRuntimeValue(
    v: unknown,
  ): v is SerializedModuleParameterRuntimeValue {
    return (
      v instanceof Object &&
      "_kind" in v &&
      v._kind === "ModuleParameterRuntimeValue"
    );
  }

  private static _deserializeModuleParameterRuntimeValue(
    serialized: SerializedModuleParameterRuntimeValue,
  ): ModuleParameterRuntimeValue<ModuleParameterType> {
    let defaultValue: ModuleParameterType | undefined;
    if (serialized.defaultValue !== undefined) {
      // We cast here because we receive an `unknown`, but we known it came from
      // serializing a ModuleParameterType
      const parsedDefaultValue = this._jsonParseWithBigint(
        serialized.defaultValue,
      );

      if (
        typeof parsedDefaultValue === "object" &&
        parsedDefaultValue !== null &&
        "accountIndex" in parsedDefaultValue &&
        typeof parsedDefaultValue.accountIndex === "number"
      ) {
        defaultValue = new AccountRuntimeValueImplementation(
          parsedDefaultValue.accountIndex,
        );
      } else {
        defaultValue = parsedDefaultValue as ModuleParameterType;
      }
    }

    return new ModuleParameterRuntimeValueImplementation(
      serialized.moduleId,
      serialized.name,
      defaultValue,
    );
  }
}
