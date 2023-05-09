import { inspect } from "util";

import { ArtifactType, SolidityParamsType } from "../stubs";
import {
  Future,
  FutureType,
  IgnitionModule,
  NamedContractDeploymentFuture,
  ArtifactContractDeploymentFuture,
  IgnitionModuleResult,
  NamedLibraryDeploymentFuture,
  ArtifactLibraryDeploymentFuture,
  NamedContractCallFuture,
  ContractFuture,
  NamedStaticCallFuture,
} from "../types/module";

export abstract class BaseFuture<
  FutureTypeT extends FutureType,
  ResultT = unknown
> implements Future<ResultT>
{
  public readonly dependencies: Set<Future> = new Set();

  constructor(
    public readonly id: string,
    public readonly type: FutureTypeT,
    public readonly module: IgnitionModuleImplementation
  ) {}

  public [inspect.custom]() {
    const padding = " ".repeat(2);

    return `Future ${this.id} {
  Type: ${FutureType[this.type]}
  Module: ${this.module.id}
  Dependencies: ${inspect(
    Array.from(this.dependencies).map((f) => f.id)
  ).replace(/\n/g, `\n${padding}`)}
}`;
  }
}

export class NamedContractDeploymentFutureImplementation<
    ContractNameT extends string
  >
  extends BaseFuture<FutureType.NAMED_CONTRACT_DEPLOYMENT, string>
  implements NamedContractDeploymentFuture<ContractNameT>
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly contractName: ContractNameT,
    public readonly constructorArgs: SolidityParamsType,
    public readonly libraries: Record<string, ContractFuture<string>>
  ) {
    super(id, FutureType.NAMED_CONTRACT_DEPLOYMENT, module);
  }
}

export class ArtifactContractDeploymentFutureImplementation<
    ContractNameT extends string
  >
  extends BaseFuture<FutureType.ARTIFACT_CONTRACT_DEPLOYMENT, string>
  implements ArtifactContractDeploymentFuture
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly contractName: ContractNameT,
    public readonly constructorArgs: SolidityParamsType,
    public readonly artifact: ArtifactType,
    public readonly libraries: Record<string, ContractFuture<string>>
  ) {
    super(id, FutureType.ARTIFACT_CONTRACT_DEPLOYMENT, module);
  }
}

export class NamedLibraryDeploymentFutureImplementation<
    LibraryNameT extends string
  >
  extends BaseFuture<FutureType.NAMED_LIBRARY_DEPLOYMENT, string>
  implements NamedLibraryDeploymentFuture<LibraryNameT>
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly contractName: LibraryNameT,
    public readonly libraries: Record<string, ContractFuture<string>>
  ) {
    super(id, FutureType.NAMED_LIBRARY_DEPLOYMENT, module);
  }
}

export class ArtifactLibraryDeploymentFutureImplementation<
    LibraryNameT extends string
  >
  extends BaseFuture<FutureType.ARTIFACT_LIBRARY_DEPLOYMENT, string>
  implements ArtifactLibraryDeploymentFuture
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly contractName: LibraryNameT,
    public readonly artifact: ArtifactType,
    public readonly libraries: Record<string, ContractFuture<string>>
  ) {
    super(id, FutureType.ARTIFACT_LIBRARY_DEPLOYMENT, module);
  }
}

export class NamedContractCallFutureImplementation<
    ContractNameT extends string,
    FunctionNameT extends string
  >
  extends BaseFuture<FutureType.NAMED_CONTRACT_CALL, string>
  implements NamedContractCallFuture<ContractNameT, FunctionNameT>
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly functionName: FunctionNameT,
    public readonly contract: ContractFuture<ContractNameT>,
    public readonly args: SolidityParamsType
  ) {
    super(id, FutureType.NAMED_CONTRACT_CALL, module);
  }
}

export class NamedStaticCallFutureImplementation<
    ContractNameT extends string,
    FunctionNameT extends string
  >
  extends BaseFuture<FutureType.NAMED_STATIC_CALL, string>
  implements NamedStaticCallFuture<ContractNameT, FunctionNameT>
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly functionName: FunctionNameT,
    public readonly contract: ContractFuture<ContractNameT>,
    public readonly args: SolidityParamsType
  ) {
    super(id, FutureType.NAMED_STATIC_CALL, module);
  }
}

export class IgnitionModuleImplementation<
  ModuleIdT extends string = string,
  ContractNameT extends string = string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT> = IgnitionModuleResult<ContractNameT>
> implements IgnitionModule<ModuleIdT, ContractNameT, IgnitionModuleResultsT>
{
  public readonly futures: Set<Future> = new Set();
  public readonly submodules: Set<IgnitionModule> = new Set();

  constructor(
    public readonly id: ModuleIdT,
    public readonly results: IgnitionModuleResultsT
  ) {}

  public [inspect.custom]() {
    const padding = " ".repeat(2);

    return `IgnitionModule ${this.id} {
  Futures: ${inspect(this.futures).replace(/\n/g, `\n${padding}`)}
  Results: ${inspect(this.results).replace(/\n/g, `\n${padding}`)}
  Submodules: ${inspect(Array.from(this.submodules).map((m) => m.id)).replace(
    /\n/g,
    `\n${padding}`
  )}
}`;
  }
}
