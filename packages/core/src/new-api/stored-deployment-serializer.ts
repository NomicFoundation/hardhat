import { IgnitionError } from "../errors";

import {
  ArtifactContractDeploymentFutureImplementation,
  ArtifactLibraryDeploymentFutureImplementation,
  ContractAtFutureImplementation,
  IgnitionModuleImplementation,
  NamedContractCallFutureImplementation,
  NamedContractDeploymentFutureImplementation,
  NamedLibraryDeploymentFutureImplementation,
  NamedStaticCallFutureImplementation,
} from "./internal/module";
import { isFuture } from "./internal/utils";
import {
  ContractFuture,
  Future,
  FutureType,
  IgnitionModule,
  IgnitionModuleResult,
} from "./types/module";
import {
  BaseSerializedFuture,
  FutureToken,
  ModuleToken,
  SerializedArtifactContractDeploymentFuture,
  SerializedArtifactLibraryDeploymentFuture,
  SerializedContractAtFuture,
  SerializedFuture,
  SerializedLibraries,
  SerializedNamedContractCallFuture,
  SerializedNamedContractDeploymentFuture,
  SerializedNamedLibraryDeploymentFuture,
  SerializedNamedStaticCallFuture,
  SerializedSolidityParamType,
  SerializedStoredDeployment,
  SerializedStoredModule,
  SerializedStoredResults,
  StoredDeployment,
} from "./types/serialized-deployment";

export type PartialSerializedFuture = BaseSerializedFuture & {
  module?: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  dependencies: FutureToken[];
  constructorArgs?: Array<string | number | FutureToken>;
};

/**
 * Serialize/Deserialize a deployment to json.
 *
 * @beta
 */
export class StoredDeploymentSerializer {
  public static serialize(
    deployment: StoredDeployment
  ): SerializedStoredDeployment {
    const allModules = this._getModulesAndSubmoduleFor(deployment.module);

    return {
      details: {
        ...deployment.details,
      },
      startModule: deployment.module.id,
      modules: Object.fromEntries(
        allModules.map((m) => [m.id, this._serializeModule(m)])
      ),
    };
  }

  public static deserialize(
    serializedDeployment: SerializedStoredDeployment
  ): StoredDeployment {
    const partialFutures =
      this._partialDeserializeAllFuturesFor(serializedDeployment);

    const partialModules = Object.values(serializedDeployment.modules).map(
      (sm) => this._deserializePartialModule(sm, partialFutures)
    );

    this._rewireSubmoduleTokensToModulesFor(
      partialModules,
      serializedDeployment
    );

    this._recursivelyRewireFuturesToParentModule(partialModules);

    const startModule = partialModules.find(
      (m) => m.id === serializedDeployment.startModule
    );

    if (startModule === undefined) {
      throw new Error(
        "Failure during deserialization, could not find startModule"
      );
    }

    return {
      details: {
        ...serializedDeployment.details,
      },
      module: startModule,
    };
  }

  private static _rewireSubmoduleTokensToModulesFor(
    partialModules: Array<
      IgnitionModule<string, string, IgnitionModuleResult<string>>
    >,
    serializedDeployment: SerializedStoredDeployment
  ): void {
    for (const partialModule of partialModules) {
      const serializedModule = serializedDeployment.modules[partialModule.id];

      const submodules = serializedModule.submodules.map((moduleToken) => {
        const mod = partialModules.find((pm) => pm.id === moduleToken.moduleId);

        if (mod === undefined) {
          throw new Error("Deserialization error while looking up module");
        }

        return mod;
      });

      this._overwriteReadonly(partialModule, "submodules", new Set(submodules));
    }
  }

  /**
   * Create a partial future object for every future token in every
   * serialized module and submodule.
   *
   * By partial we mean that the future object will have a placeholder
   * module that will be switched for the correct module object in
   * a later phase.
   *
   * @param serializedFutures - the serialized version of the futures
   * @returns partial futures, that will need further edits to
   * become valid
   */
  private static _partialDeserializeAllFuturesFor(
    deployment: SerializedStoredDeployment
  ): { [key: string]: Future<unknown> } {
    const allSerializedFutures = this._getAllFuturesFor(deployment);

    const partialFutures = allSerializedFutures.map(
      this._deserializePartialFuture
    );

    const serializedFutureLookup = Object.fromEntries(
      allSerializedFutures.map((f) => [f.id, f])
    );

    const partialFutureLookup = Object.fromEntries(
      partialFutures.map((f) => [f.id, f])
    );

    // update dependencies to be other future objects
    for (const future of partialFutures) {
      const serializedFuture = serializedFutureLookup[future.id];

      const dependencies = serializedFuture.dependencies
        .map((sf) => partialFutureLookup[sf.futureId])
        .filter((x): x is Future => Boolean(x));

      dependencies.forEach((dep) => future.dependencies.add(dep));
    }

    // per future type, rewire other properties that could include references
    for (const future of partialFutures) {
      const serializedFuture = serializedFutureLookup[future.id];

      if (future instanceof NamedContractDeploymentFutureImplementation) {
        this._overwriteReadonly(
          future,
          "constructorArgs",
          future.constructorArgs.map((arg) =>
            this._deserializeArg(arg, partialFutureLookup)
          )
        );

        this._overwriteReadonly(
          future,
          "libraries",
          this._deserializeLibraries(
            (serializedFuture as SerializedNamedContractDeploymentFuture)
              .libraries,
            partialFutureLookup
          )
        );
      } else if (
        future instanceof ArtifactContractDeploymentFutureImplementation
      ) {
        this._overwriteReadonly(
          future,
          "constructorArgs",
          future.constructorArgs.map((arg) =>
            this._deserializeArg(arg, partialFutureLookup)
          )
        );

        this._overwriteReadonly(
          future,
          "libraries",
          this._deserializeLibraries(
            (serializedFuture as SerializedArtifactContractDeploymentFuture)
              .libraries,
            partialFutureLookup
          )
        );
      } else if (future instanceof NamedLibraryDeploymentFutureImplementation) {
        this._overwriteReadonly(
          future,
          "libraries",
          this._deserializeLibraries(
            (serializedFuture as SerializedNamedLibraryDeploymentFuture)
              .libraries,
            partialFutureLookup
          )
        );
      } else if (
        future instanceof ArtifactLibraryDeploymentFutureImplementation
      ) {
        this._overwriteReadonly(
          future,
          "libraries",
          this._deserializeLibraries(
            (serializedFuture as SerializedArtifactLibraryDeploymentFuture)
              .libraries,
            partialFutureLookup
          )
        );
      } else if (future instanceof NamedContractCallFutureImplementation) {
        this._overwriteReadonly(
          future,
          "args",
          future.args.map((arg) =>
            this._deserializeArg(arg, partialFutureLookup)
          )
        );

        this._overwriteReadonly(
          future,
          "contract",
          partialFutureLookup[
            (serializedFuture as SerializedNamedContractCallFuture).contract
              .futureId
          ] as ContractFuture<string>
        );
      } else if (future instanceof NamedStaticCallFutureImplementation) {
        this._overwriteReadonly(
          future,
          "args",
          future.args.map((arg) =>
            this._deserializeArg(arg, partialFutureLookup)
          )
        );

        this._overwriteReadonly(
          future,
          "contract",
          partialFutureLookup[
            (serializedFuture as SerializedNamedContractCallFuture).contract
              .futureId
          ] as ContractFuture<string>
        );
      } else if (future instanceof ContractAtFutureImplementation) {
        // no future specific tokens to resolve
      } else {
        throw new IgnitionError(
          `unknown future type: ${FutureType[future.type]}`
        );
      }
    }

    return partialFutureLookup;
  }

  private static _deserializePartialModule(
    serializedModule: SerializedStoredModule,
    allPartialFutures: {
      [key: string]: Future<unknown>;
    }
  ): IgnitionModule<string, string, IgnitionModuleResult<string>> {
    const results = this._deserializeResultsFrom(
      serializedModule.results,
      allPartialFutures
    );

    const module = new IgnitionModuleImplementation(
      serializedModule.id,
      results as IgnitionModuleResult<"">
    );

    const futures = [
      ...new Set(Object.values(serializedModule.futures).map(({ id }) => id)),
    ].map((id) => allPartialFutures[id]);

    this._overwriteReadonly(module, "futures", new Set(futures));

    return module;
  }

  private static _recursivelyRewireFuturesToParentModule(
    partialModules: Array<
      IgnitionModule<string, string, IgnitionModuleResult<string>>
    >
  ): void {
    for (const partialModule of partialModules) {
      for (const future of partialModule.futures) {
        future.module = partialModule;
      }
    }
  }

  private static _deserializeLibraries(
    libraries: SerializedLibraries,
    partialFutureLookup: {
      [k: string]: Future<unknown>;
    }
  ): Record<string, ContractFuture<string>> {
    return Object.fromEntries(
      Object.entries(libraries).map(([key, token]) => [
        key,
        partialFutureLookup[token.futureId] as ContractFuture<string>,
      ])
    );
  }

  /**
   * Oh you think you can defeat me typesystem. I don't acknowledge
   * your _readonly_.
   */
  private static _overwriteReadonly<O, P extends keyof O, V extends O[P]>(
    obj: O,
    property: P,
    value: V
  ) {
    obj[property] = value;
  }

  private static _serializeModule(
    userModule: IgnitionModule<string, string, IgnitionModuleResult<string>>
  ): SerializedStoredModule {
    return {
      id: userModule.id,
      futures: Object.fromEntries(
        Array.from(userModule.futures).map((future) => [
          future.id,
          this._serializeFuture(future),
        ])
      ),
      submodules: Array.from(userModule.submodules).map(
        this._convertModuleToModuleToken
      ),
      results: Object.fromEntries(
        Object.entries(userModule.results).map(([key, future]) => [
          key,
          this._convertFutureToFutureToken(future),
        ])
      ),
    };
  }

  private static _serializeFuture(future: Future): SerializedFuture {
    const serialized: PartialSerializedFuture = {
      ...future,
      dependencies: Array.from(future.dependencies).map(
        StoredDeploymentSerializer._convertFutureToFutureToken
      ),
    };

    delete serialized.module;

    if (future instanceof NamedContractDeploymentFutureImplementation) {
      const serializedNamedContract: SerializedNamedContractDeploymentFuture = {
        id: future.id,
        type: future.type,
        dependencies: Array.from(future.dependencies).map(
          StoredDeploymentSerializer._convertFutureToFutureToken
        ),
        contractName: future.contractName,
        constructorArgs: future.constructorArgs.map((arg) =>
          StoredDeploymentSerializer._convertArgToFutureToken(arg)
        ),
        libraries: this._convertLibrariesToLibraryTokens(future.libraries),
      };

      return serializedNamedContract;
    } else if (
      future instanceof ArtifactContractDeploymentFutureImplementation
    ) {
      const serializedArtifactContractDeploy: SerializedArtifactContractDeploymentFuture =
        {
          id: future.id,
          type: future.type,
          dependencies: Array.from(future.dependencies).map(
            StoredDeploymentSerializer._convertFutureToFutureToken
          ),
          contractName: future.contractName,
          constructorArgs: future.constructorArgs.map((arg) =>
            this._convertArgToFutureToken(arg)
          ),
          artifact: future.artifact,
          libraries: this._convertLibrariesToLibraryTokens(future.libraries),
        };

      return serializedArtifactContractDeploy;
    } else if (future instanceof NamedLibraryDeploymentFutureImplementation) {
      const serializedNamedLibraryDeploy: SerializedNamedLibraryDeploymentFuture =
        {
          id: future.id,
          type: future.type,
          dependencies: Array.from(future.dependencies).map(
            StoredDeploymentSerializer._convertFutureToFutureToken
          ),
          contractName: future.contractName,
          libraries:
            StoredDeploymentSerializer._convertLibrariesToLibraryTokens(
              future.libraries
            ),
        };

      return serializedNamedLibraryDeploy;
    } else if (
      future instanceof ArtifactLibraryDeploymentFutureImplementation
    ) {
      const serializedArtifactLibraryDeploy: SerializedArtifactLibraryDeploymentFuture =
        {
          id: future.id,
          type: future.type,
          dependencies: Array.from(future.dependencies).map(
            StoredDeploymentSerializer._convertFutureToFutureToken
          ),
          contractName: future.contractName,
          artifact: future.artifact,
          libraries:
            StoredDeploymentSerializer._convertLibrariesToLibraryTokens(
              future.libraries
            ),
        };

      return serializedArtifactLibraryDeploy;
    } else if (future instanceof NamedContractCallFutureImplementation) {
      const serializedNamedContractCall: SerializedNamedContractCallFuture = {
        id: future.id,
        type: future.type,
        dependencies: Array.from(future.dependencies).map(
          StoredDeploymentSerializer._convertFutureToFutureToken
        ),
        contract: this._convertFutureToFutureToken(future.contract),
        functionName: future.functionName,
        args: Array.from(future.args).map(
          StoredDeploymentSerializer._convertArgToFutureToken
        ),
      };

      return serializedNamedContractCall;
    } else if (future instanceof NamedStaticCallFutureImplementation) {
      const serializedNamedStaticCallFuture: SerializedNamedStaticCallFuture = {
        id: future.id,
        type: future.type,
        dependencies: Array.from(future.dependencies).map(
          StoredDeploymentSerializer._convertFutureToFutureToken
        ),
        contract: this._convertFutureToFutureToken(future.contract),
        functionName: future.functionName,
        args: Array.from(future.args).map(
          StoredDeploymentSerializer._convertArgToFutureToken
        ),
      };

      return serializedNamedStaticCallFuture;
    } else if (future instanceof ContractAtFutureImplementation) {
      const serializedContractAtFuture: SerializedContractAtFuture = {
        id: future.id,
        type: future.type,
        dependencies: Array.from(future.dependencies).map(
          StoredDeploymentSerializer._convertFutureToFutureToken
        ),
        contractName: future.contractName,
        address: future.address,
        artifact: future.artifact,
      };

      return serializedContractAtFuture;
    } else {
      throw new IgnitionError(
        `Unknown future type while serializing: ${FutureType[future.type]}`
      );
    }
  }

  private static _convertLibrariesToLibraryTokens(
    libraries: Record<string, ContractFuture<string>>
  ): SerializedLibraries {
    return Object.fromEntries(
      Object.entries(libraries).map(([key, lib]) => [
        key,
        this._convertFutureToFutureToken(lib),
      ])
    );
  }

  private static _deserializeResultsFrom(
    serializedResults: SerializedStoredResults,
    futures: { [key: string]: Future<unknown> }
  ): IgnitionModuleResult<""> {
    const results = Object.fromEntries(
      Object.entries(serializedResults).map(([key, futureToken]) => [
        key,
        futures[futureToken.futureId],
      ])
    );

    return results as IgnitionModuleResult<"">;
  }

  private static _deserializePartialFuture(
    serializedFuture: SerializedFuture
  ): Future {
    const placeholderModule = new IgnitionModuleImplementation(
      "PLACEHOLDER",
      {}
    );

    switch (serializedFuture.type) {
      case FutureType.NAMED_CONTRACT_DEPLOYMENT:
        return new NamedContractDeploymentFutureImplementation(
          serializedFuture.id,
          placeholderModule,
          serializedFuture.contractName,
          serializedFuture.constructorArgs,
          {}
        );
      case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
        return new ArtifactContractDeploymentFutureImplementation(
          serializedFuture.id,
          placeholderModule,
          serializedFuture.contractName,
          serializedFuture.constructorArgs,
          serializedFuture.artifact,
          {}
        );
      case FutureType.NAMED_LIBRARY_DEPLOYMENT:
        return new NamedLibraryDeploymentFutureImplementation(
          serializedFuture.id,
          placeholderModule,
          serializedFuture.contractName,
          {}
        );
      case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
        return new ArtifactLibraryDeploymentFutureImplementation(
          serializedFuture.id,
          placeholderModule,
          serializedFuture.contractName,
          serializedFuture.artifact,
          {}
        );
      case FutureType.NAMED_CONTRACT_CALL:
        return new NamedContractCallFutureImplementation(
          serializedFuture.id,
          placeholderModule,
          serializedFuture.functionName,
          serializedFuture.contract as any,
          serializedFuture.args
        );
      case FutureType.NAMED_STATIC_CALL:
        return new NamedStaticCallFutureImplementation(
          serializedFuture.id,
          placeholderModule,
          serializedFuture.functionName,
          serializedFuture.contract as any,
          serializedFuture.args
        );
      case FutureType.CONTRACT_AT:
        return new ContractAtFutureImplementation(
          serializedFuture.id,
          placeholderModule,
          serializedFuture.contractName,
          serializedFuture.address,
          serializedFuture.artifact
        );
    }
  }

  private static _convertArgToFutureToken(
    arg: number | string | Future
  ): number | string | FutureToken {
    if (!isFuture(arg)) {
      return arg;
    }

    return StoredDeploymentSerializer._convertFutureToFutureToken(arg);
  }

  private static _convertFutureToFutureToken(future: Future): FutureToken {
    return {
      futureId: future.id,
      _kind: "FutureToken",
    };
  }

  private static _convertModuleToModuleToken(
    m: IgnitionModule<string, string, IgnitionModuleResult<string>>
  ): ModuleToken {
    return {
      moduleId: m.id,
      _kind: "ModuleToken",
    };
  }

  private static _deserializeArg(
    arg: number | string | FutureToken,
    futureLookup: {
      [key: string]: Future<unknown>;
    }
  ) {
    if (!StoredDeploymentSerializer._isSerializedFutureToken(arg)) {
      return arg;
    }

    const swappedFuture = futureLookup[arg.futureId];

    if (swappedFuture === undefined) {
      throw new IgnitionError(
        `Unable to lookup future during deserialization: ${arg.futureId}`
      );
    }

    return swappedFuture;
  }

  private static _isSerializedFutureToken(
    arg: SerializedSolidityParamType
  ): arg is FutureToken {
    if (!Boolean(arg) || typeof arg === "string" || typeof arg === "number") {
      return false;
    }

    return arg._kind === "FutureToken";
  }

  private static _getModulesAndSubmoduleFor(
    module: IgnitionModule<string, string, IgnitionModuleResult<string>>
  ): Array<IgnitionModule<string, string, IgnitionModuleResult<string>>> {
    return [module].concat(
      Array.from(module.submodules).flatMap((sm) =>
        this._getModulesAndSubmoduleFor(sm)
      )
    );
  }

  private static _getAllFuturesFor(
    deployment: SerializedStoredDeployment
  ): SerializedFuture[] {
    return Object.values(deployment.modules).flatMap((m) =>
      Object.values(m.futures)
    );
  }
}
