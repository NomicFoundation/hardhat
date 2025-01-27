import type { Artifact } from "../types/artifact";
import type {
  AccountRuntimeValue,
  AddressResolvableFuture,
  ArgumentType,
  ContractAtFuture,
  ContractDeploymentFuture,
  LibraryDeploymentFuture,
  ContractFuture,
  Future,
  IgnitionModule,
  IgnitionModuleResult,
  ModuleParameterRuntimeValue,
  ModuleParameterType,
  NamedArtifactContractAtFuture,
  ContractCallFuture,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactLibraryDeploymentFuture,
  StaticCallFuture,
  ReadEventArgumentFuture,
  SendDataFuture,
  EncodeFunctionCallFuture,
} from "../types/module";

import { FutureType, RuntimeValueType } from "../types/module";

const CUSTOM_INSPECT_SYMBOL: symbol = Symbol.for("nodejs.util.inspect.custom");

abstract class BaseFutureImplementation<FutureTypeT extends FutureType> {
  public readonly dependencies: Set<Future | IgnitionModule> = new Set();

  constructor(
    public readonly id: string,
    public readonly type: FutureTypeT,
    public readonly module: IgnitionModuleImplementation,
  ) {
    Object.defineProperty(this, CUSTOM_INSPECT_SYMBOL, {
      value: (
        _depth: number,
        { inspect }: { inspect: (arg: {}) => string },
      ) => {
        const padding = " ".repeat(2);

        return `Future ${this.id} {
        Type: ${FutureType[this.type]}
        Module: ${this.module.id}
        Dependencies: ${inspect(
          Array.from(this.dependencies).map((f) => f.id),
        ).replace(/\n/g, `\n${padding}`)}
      }`;
      },
      writable: false,
      enumerable: false,
      configurable: true,
    });
  }
}

export class NamedContractDeploymentFutureImplementation<
    ContractNameT extends string,
  >
  extends BaseFutureImplementation<FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT>
  implements NamedArtifactContractDeploymentFuture<ContractNameT>
{
  constructor(
    public override readonly id: string,
    public override readonly module: IgnitionModuleImplementation,
    public readonly contractName: ContractNameT,
    public readonly constructorArgs: ArgumentType[],
    public readonly libraries: Record<string, ContractFuture<string>>,
    public readonly value:
      | bigint
      | ModuleParameterRuntimeValue<bigint>
      | StaticCallFuture<string, string>
      | ReadEventArgumentFuture,
    public readonly from: string | AccountRuntimeValue | undefined,
  ) {
    super(id, FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT, module);
  }
}

export class ArtifactContractDeploymentFutureImplementation<
    ContractNameT extends string,
  >
  extends BaseFutureImplementation<FutureType.CONTRACT_DEPLOYMENT>
  implements ContractDeploymentFuture
{
  constructor(
    public override readonly id: string,
    public override readonly module: IgnitionModuleImplementation,
    public readonly contractName: ContractNameT,
    public readonly constructorArgs: ArgumentType[],
    public readonly artifact: Artifact,
    public readonly libraries: Record<string, ContractFuture<string>>,
    public readonly value:
      | bigint
      | ModuleParameterRuntimeValue<bigint>
      | StaticCallFuture<string, string>
      | ReadEventArgumentFuture,
    public readonly from: string | AccountRuntimeValue | undefined,
  ) {
    super(id, FutureType.CONTRACT_DEPLOYMENT, module);
  }
}

export class NamedLibraryDeploymentFutureImplementation<
    LibraryNameT extends string,
  >
  extends BaseFutureImplementation<FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT>
  implements NamedArtifactLibraryDeploymentFuture<LibraryNameT>
{
  constructor(
    public override readonly id: string,
    public override readonly module: IgnitionModuleImplementation,
    public readonly contractName: LibraryNameT,
    public readonly libraries: Record<string, ContractFuture<string>>,
    public readonly from: string | AccountRuntimeValue | undefined,
  ) {
    super(id, FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT, module);
  }
}

export class ArtifactLibraryDeploymentFutureImplementation<
    LibraryNameT extends string,
  >
  extends BaseFutureImplementation<FutureType.LIBRARY_DEPLOYMENT>
  implements LibraryDeploymentFuture
{
  constructor(
    public override readonly id: string,
    public override readonly module: IgnitionModuleImplementation,
    public readonly contractName: LibraryNameT,
    public readonly artifact: Artifact,
    public readonly libraries: Record<string, ContractFuture<string>>,
    public readonly from: string | AccountRuntimeValue | undefined,
  ) {
    super(id, FutureType.LIBRARY_DEPLOYMENT, module);
  }
}

export class NamedContractCallFutureImplementation<
    ContractNameT extends string,
    FunctionNameT extends string,
  >
  extends BaseFutureImplementation<FutureType.CONTRACT_CALL>
  implements ContractCallFuture<ContractNameT, FunctionNameT>
{
  constructor(
    public override readonly id: string,
    public override readonly module: IgnitionModuleImplementation,
    public readonly functionName: FunctionNameT,
    public readonly contract: ContractFuture<ContractNameT>,
    public readonly args: ArgumentType[],
    public readonly value:
      | bigint
      | ModuleParameterRuntimeValue<bigint>
      | StaticCallFuture<string, string>
      | ReadEventArgumentFuture,
    public readonly from: string | AccountRuntimeValue | undefined,
  ) {
    super(id, FutureType.CONTRACT_CALL, module);
  }
}

export class NamedStaticCallFutureImplementation<
    ContractNameT extends string,
    FunctionNameT extends string,
  >
  extends BaseFutureImplementation<FutureType.STATIC_CALL>
  implements StaticCallFuture<ContractNameT, FunctionNameT>
{
  constructor(
    public override readonly id: string,
    public override readonly module: IgnitionModuleImplementation,
    public readonly functionName: FunctionNameT,
    public readonly contract: ContractFuture<ContractNameT>,
    public readonly args: ArgumentType[],
    public readonly nameOrIndex: string | number,
    public readonly from: string | AccountRuntimeValue | undefined,
  ) {
    super(id, FutureType.STATIC_CALL, module);
  }
}

export class NamedEncodeFunctionCallFutureImplementation<
    ContractNameT extends string,
    FunctionNameT extends string,
  >
  extends BaseFutureImplementation<FutureType.ENCODE_FUNCTION_CALL>
  implements EncodeFunctionCallFuture<ContractNameT, FunctionNameT>
{
  constructor(
    public override readonly id: string,
    public override readonly module: IgnitionModuleImplementation,
    public readonly functionName: FunctionNameT,
    public readonly contract: ContractFuture<ContractNameT>,
    public readonly args: ArgumentType[],
  ) {
    super(id, FutureType.ENCODE_FUNCTION_CALL, module);
  }
}

export class NamedContractAtFutureImplementation<ContractNameT extends string>
  extends BaseFutureImplementation<FutureType.NAMED_ARTIFACT_CONTRACT_AT>
  implements NamedArtifactContractAtFuture<ContractNameT>
{
  constructor(
    public override readonly id: string,
    public override readonly module: IgnitionModuleImplementation,
    public readonly contractName: ContractNameT,
    public readonly address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
  ) {
    super(id, FutureType.NAMED_ARTIFACT_CONTRACT_AT, module);
  }
}

export class ArtifactContractAtFutureImplementation
  extends BaseFutureImplementation<FutureType.CONTRACT_AT>
  implements ContractAtFuture
{
  constructor(
    public override readonly id: string,
    public override readonly module: IgnitionModuleImplementation,
    public readonly contractName: string,
    public readonly address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    public readonly artifact: Artifact,
  ) {
    super(id, FutureType.CONTRACT_AT, module);
  }
}

export class ReadEventArgumentFutureImplementation
  extends BaseFutureImplementation<FutureType.READ_EVENT_ARGUMENT>
  implements ReadEventArgumentFuture
{
  constructor(
    public override readonly id: string,
    public override readonly module: IgnitionModuleImplementation,
    public readonly futureToReadFrom:
      | NamedArtifactContractDeploymentFuture<string>
      | ContractDeploymentFuture
      | SendDataFuture
      | ContractCallFuture<string, string>,
    public readonly eventName: string,
    public readonly nameOrIndex: string | number,
    public readonly emitter: ContractFuture<string>,
    public readonly eventIndex: number,
  ) {
    super(id, FutureType.READ_EVENT_ARGUMENT, module);
  }
}

export class SendDataFutureImplementation
  extends BaseFutureImplementation<FutureType.SEND_DATA>
  implements SendDataFuture
{
  constructor(
    public override readonly id: string,
    public override readonly module: IgnitionModuleImplementation,
    public readonly to:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>
      | AccountRuntimeValue,
    public readonly value: bigint | ModuleParameterRuntimeValue<bigint>,
    public readonly data:
      | string
      | EncodeFunctionCallFuture<string, string>
      | undefined,
    public readonly from: string | AccountRuntimeValue | undefined,
  ) {
    super(id, FutureType.SEND_DATA, module);
  }
}

export class IgnitionModuleImplementation<
  ModuleIdT extends string = string,
  ContractNameT extends string = string,
  IgnitionModuleResultsT extends
    IgnitionModuleResult<ContractNameT> = IgnitionModuleResult<ContractNameT>,
> implements IgnitionModule<ModuleIdT, ContractNameT, IgnitionModuleResultsT>
{
  public readonly futures: Set<Future> = new Set();
  public readonly submodules: Set<IgnitionModule> = new Set();

  constructor(
    public readonly id: ModuleIdT,
    public readonly results: IgnitionModuleResultsT,
  ) {
    Object.defineProperty(this, CUSTOM_INSPECT_SYMBOL, {
      value: (
        _depth: number,
        { inspect }: { inspect: (arg: {}) => string },
      ) => {
        const padding = " ".repeat(2);

        return `IgnitionModule ${this.id} {
        Futures: ${inspect(this.futures).replace(/\n/g, `\n${padding}`)}
        Results: ${inspect(this.results).replace(/\n/g, `\n${padding}`)}
        Submodules: ${inspect(
          Array.from(this.submodules).map((m) => m.id),
        ).replace(/\n/g, `\n${padding}`)}
      }`;
      },
      writable: false,
      enumerable: false,
      configurable: true,
    });
  }
}

export class AccountRuntimeValueImplementation implements AccountRuntimeValue {
  public readonly type: RuntimeValueType.ACCOUNT = RuntimeValueType.ACCOUNT;

  constructor(public readonly accountIndex: number) {
    Object.defineProperty(this, CUSTOM_INSPECT_SYMBOL, {
      value: (
        _depth: number,
        _inspectOptions: { inspect: (arg: {}) => string },
      ) => {
        return `Account RuntimeValue {
          accountIndex: ${this.accountIndex}
      }`;
      },
      writable: false,
      enumerable: false,
      configurable: true,
    });
  }
}

export class ModuleParameterRuntimeValueImplementation<
  ParamTypeT extends ModuleParameterType,
> implements ModuleParameterRuntimeValue<ParamTypeT>
{
  public readonly type: RuntimeValueType.MODULE_PARAMETER =
    RuntimeValueType.MODULE_PARAMETER;

  constructor(
    public readonly moduleId: string,
    public readonly name: string,
    public readonly defaultValue: ParamTypeT | undefined,
  ) {
    Object.defineProperty(this, CUSTOM_INSPECT_SYMBOL, {
      value: (
        _depth: number,
        { inspect }: { inspect: (arg: {}) => string },
      ) => {
        return `Module Parameter RuntimeValue {
          name: ${this.name}${
            this.defaultValue !== undefined
              ? `
          default value: ${inspect(this.defaultValue)}`
              : ""
          }
      }`;
      },
      writable: false,
      enumerable: false,
      configurable: true,
    });
  }
}
