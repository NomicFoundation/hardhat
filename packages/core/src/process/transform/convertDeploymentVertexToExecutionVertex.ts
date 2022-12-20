import { BigNumber } from "ethers";

import { Services } from "services/types";
import {
  ArtifactContractDeploymentVertex,
  ArtifactLibraryDeploymentVertex,
  CallDeploymentVertex,
  DeployedContractDeploymentVertex,
  HardhatContractDeploymentVertex,
  HardhatLibraryDeploymentVertex,
  IDeploymentGraph,
  DeploymentGraphVertex,
  ExternalParamValue,
  EventVertex,
  SendVertex,
} from "types/deploymentGraph";
import {
  AwaitedEvent,
  ContractCall,
  ContractDeploy,
  DeployedContract,
  ExecutionVertex,
  LibraryDeploy,
  SentETH,
} from "types/executionGraph";
import {
  BytesFuture,
  DeploymentGraphFuture,
  EventParamFuture,
} from "types/future";
import { Artifact } from "types/hardhat";
import { isBytesArg, isFuture } from "utils/guards";

interface TransformContext {
  services: Services;
  graph: IDeploymentGraph;
}

export function convertDeploymentVertexToExecutionVertex(
  context: TransformContext
): (deploymentVertex: DeploymentGraphVertex) => Promise<ExecutionVertex> {
  return (
    deploymentVertex: DeploymentGraphVertex
  ): Promise<ExecutionVertex> => {
    switch (deploymentVertex.type) {
      case "HardhatContract":
        return convertHardhatContractToContractDeploy(
          deploymentVertex,
          context
        );
      case "ArtifactContract":
        return convertArtifactContractToContractDeploy(
          deploymentVertex,
          context
        );
      case "DeployedContract":
        return convertDeployedContractToDeployedDeploy(
          deploymentVertex,
          context
        );
      case "Call":
        return convertCallToContractCall(deploymentVertex, context);
      case "HardhatLibrary":
        return convertHardhatLibraryToLibraryDeploy(deploymentVertex, context);
      case "ArtifactLibrary":
        return convertArtifactLibraryToLibraryDeploy(deploymentVertex, context);
      case "Event":
        return convertAwaitToAwaitedEvent(deploymentVertex, context);
      case "SendETH":
        return convertSendToSentETH(deploymentVertex, context);
      case "Virtual":
        throw new Error(
          `Virtual vertex should be removed ${deploymentVertex.id} (${deploymentVertex.label})`
        );
      default:
        return assertDeploymentVertexNotExpected(deploymentVertex);
    }
  };
}

async function convertHardhatContractToContractDeploy(
  vertex: HardhatContractDeploymentVertex,
  transformContext: TransformContext
): Promise<ContractDeploy> {
  const artifact: Artifact =
    await transformContext.services.artifacts.getArtifact(vertex.contractName);

  return {
    type: "ContractDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact,
    args: await convertArgs(vertex.args, transformContext),
    libraries: vertex.libraries,
    value: (await resolveParameter(
      vertex.value,
      transformContext
    )) as BigNumber,
  };
}

async function convertArtifactContractToContractDeploy(
  vertex: ArtifactContractDeploymentVertex,
  transformContext: TransformContext
): Promise<ContractDeploy> {
  return {
    type: "ContractDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact: vertex.artifact,
    args: await convertArgs(vertex.args, transformContext),
    libraries: vertex.libraries,
    value: (await resolveParameter(
      vertex.value,
      transformContext
    )) as BigNumber,
  };
}

async function convertDeployedContractToDeployedDeploy(
  vertex: DeployedContractDeploymentVertex,
  _transformContext: TransformContext
): Promise<DeployedContract> {
  return {
    type: "DeployedContract",
    id: vertex.id,
    label: vertex.label,
    address: vertex.address,
    abi: vertex.abi,
  };
}

async function convertCallToContractCall(
  vertex: CallDeploymentVertex,
  transformContext: TransformContext
): Promise<ContractCall> {
  return {
    type: "ContractCall",
    id: vertex.id,
    label: vertex.label,
    contract: await resolveParameter(vertex.contract, transformContext),
    method: vertex.method,
    args: await convertArgs(vertex.args, transformContext),
    value: (await resolveParameter(
      vertex.value,
      transformContext
    )) as BigNumber,
  };
}

async function convertHardhatLibraryToLibraryDeploy(
  vertex: HardhatLibraryDeploymentVertex,
  transformContext: TransformContext
): Promise<LibraryDeploy> {
  const artifact: Artifact =
    await transformContext.services.artifacts.getArtifact(vertex.libraryName);

  return {
    type: "LibraryDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact,
    args: await convertArgs(vertex.args, transformContext),
  };
}

async function convertArtifactLibraryToLibraryDeploy(
  vertex: ArtifactLibraryDeploymentVertex,
  transformContext: TransformContext
): Promise<LibraryDeploy> {
  return {
    type: "LibraryDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact: vertex.artifact,
    args: await convertArgs(vertex.args, transformContext),
  };
}

async function convertAwaitToAwaitedEvent(
  vertex: EventVertex,
  transformContext: TransformContext
): Promise<AwaitedEvent> {
  return {
    type: "AwaitedEvent",
    id: vertex.id,
    label: vertex.label,
    abi: vertex.abi,
    address: vertex.address,
    event: vertex.event,
    args: await convertArgs(vertex.args, transformContext),
  };
}

async function convertSendToSentETH(
  vertex: SendVertex,
  transformContext: TransformContext
): Promise<SentETH> {
  return {
    type: "SentETH",
    id: vertex.id,
    label: vertex.label,
    address: vertex.address,
    value: (await resolveParameter(
      vertex.value,
      transformContext
    )) as BigNumber,
  };
}

function assertDeploymentVertexNotExpected(
  vertex: never
): Promise<ExecutionVertex> {
  const v: any = vertex;

  const obj = typeof v === "object" && "type" in v ? v.type : v;

  throw new Error(`Type not expected: ${obj}`);
}

async function convertArgs(
  args: Array<
    | boolean
    | string
    | number
    | BigNumber
    | DeploymentGraphFuture
    | EventParamFuture
  >,
  transformContext: TransformContext
): Promise<
  Array<boolean | string | number | BigNumber | DeploymentGraphFuture>
> {
  const resolvedArgs = [];

  for (const arg of args) {
    const resolvedArg = isBytesArg(arg)
      ? await resolveBytesForArtifact(arg, transformContext.services)
      : await resolveParameter(arg, transformContext);

    resolvedArgs.push(resolvedArg);
  }

  return resolvedArgs;
}

async function resolveParameter<T extends DeploymentGraphFuture>(
  arg: ExternalParamValue | T,
  { services, graph }: TransformContext
): Promise<ExternalParamValue | T> {
  if (!isFuture(arg)) {
    return arg;
  }

  if (arg.type !== "parameter") {
    return arg;
  }

  const scope = arg.scope;
  const scopeData = graph.scopeData[scope];

  if (
    scopeData !== undefined &&
    scopeData.parameters !== undefined &&
    arg.label in scopeData.parameters
  ) {
    return scopeData.parameters[arg.label] as string | number | T;
  }

  const hasParamResult = await services.config.hasParam(arg.label);

  if (arg.subtype === "optional") {
    return hasParamResult.found
      ? services.config.getParam(arg.label)
      : (arg.defaultValue as T);
  }

  if (hasParamResult.found === false) {
    switch (hasParamResult.errorCode) {
      case "no-params":
        throw new Error(
          `No parameters object provided to deploy options, but module requires parameter "${arg.label}"`
        );
      case "param-missing":
        throw new Error(`No parameter provided for "${arg.label}"`);
      default:
        assertNeverParamResult(hasParamResult.errorCode);
    }
  }

  return services.config.getParam(arg.label);
}

async function resolveBytesForArtifact(
  arg: BytesFuture,
  services: Services
): Promise<string> {
  const artifact = await services.artifacts.getArtifact(arg.label);

  return artifact.bytecode;
}

function assertNeverParamResult(hasParamResult: never) {
  throw new Error(`Unexpected error code ${hasParamResult}`);
}
