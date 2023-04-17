import { BigNumber, ethers } from "ethers";

import { IgnitionError } from "../../../errors";
import { ExternalParamValue, InternalParamValue } from "../../../types/dsl";
import { DeploymentGraphFuture } from "../../../types/future";
import { Artifact } from "../../../types/hardhat";
import {
  ArtifactContractDeploymentVertex,
  ArtifactLibraryDeploymentVertex,
  CallDeploymentVertex,
  DeployedContractDeploymentVertex,
  DeploymentGraphVertex,
  EventVertex,
  HardhatContractDeploymentVertex,
  HardhatLibraryDeploymentVertex,
  IDeploymentGraph,
  SendVertex,
  StaticCallDeploymentVertex,
} from "../../types/deploymentGraph";
import {
  ArgValue,
  AwaitedEventExecutionVertex,
  ContractCallExecutionVertex,
  ContractDeployExecutionVertex,
  DeployedContractExecutionVertex,
  ExecutionVertex,
  LibraryDeployExecutionVertex,
  SentETHExecutionVertex,
  StaticContractCallExecutionVertex,
} from "../../types/executionGraph";
import { Services } from "../../types/services";
import { isFuture } from "../../utils/guards";

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
      case "StaticCall":
        return convertStaticCallToStaticContractCall(deploymentVertex, context);
      case "HardhatLibrary":
        return convertHardhatLibraryToLibraryDeploy(deploymentVertex, context);
      case "ArtifactLibrary":
        return convertArtifactLibraryToLibraryDeploy(deploymentVertex, context);
      case "Event":
        return convertAwaitToAwaitedEvent(deploymentVertex, context);
      case "SendETH":
        return convertSendToSentETH(deploymentVertex, context);
      case "Virtual":
        throw new IgnitionError(
          `Virtual vertex should be removed ${deploymentVertex.id} (${deploymentVertex.label})`
        );
    }
  };
}

async function convertHardhatContractToContractDeploy(
  vertex: HardhatContractDeploymentVertex,
  transformContext: TransformContext
): Promise<ContractDeployExecutionVertex> {
  const artifact: Artifact =
    await transformContext.services.artifacts.getArtifact(vertex.contractName);
  const signer: ethers.Signer =
    await transformContext.services.accounts.getSigner(vertex.from);

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
    signer,
  };
}

async function convertArtifactContractToContractDeploy(
  vertex: ArtifactContractDeploymentVertex,
  transformContext: TransformContext
): Promise<ContractDeployExecutionVertex> {
  const signer: ethers.Signer =
    await transformContext.services.accounts.getSigner(vertex.from);

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
    signer,
  };
}

async function convertDeployedContractToDeployedDeploy(
  vertex: DeployedContractDeploymentVertex,
  _transformContext: TransformContext
): Promise<DeployedContractExecutionVertex> {
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
): Promise<ContractCallExecutionVertex> {
  const signer: ethers.Signer =
    await transformContext.services.accounts.getSigner(vertex.from);

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
    signer,
  };
}

async function convertStaticCallToStaticContractCall(
  vertex: StaticCallDeploymentVertex,
  transformContext: TransformContext
): Promise<StaticContractCallExecutionVertex> {
  const signer: ethers.Signer =
    await transformContext.services.accounts.getSigner(vertex.from);

  return {
    type: "StaticContractCall",
    id: vertex.id,
    label: vertex.label,
    contract: await resolveParameter(vertex.contract, transformContext),
    method: vertex.method,
    args: await convertArgs(vertex.args, transformContext),
    signer,
  };
}

async function convertHardhatLibraryToLibraryDeploy(
  vertex: HardhatLibraryDeploymentVertex,
  transformContext: TransformContext
): Promise<LibraryDeployExecutionVertex> {
  const artifact: Artifact =
    await transformContext.services.artifacts.getArtifact(vertex.libraryName);
  const signer: ethers.Signer =
    await transformContext.services.accounts.getSigner(vertex.from);

  return {
    type: "LibraryDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact,
    args: await convertArgs(vertex.args, transformContext),
    signer,
  };
}

async function convertArtifactLibraryToLibraryDeploy(
  vertex: ArtifactLibraryDeploymentVertex,
  transformContext: TransformContext
): Promise<LibraryDeployExecutionVertex> {
  const signer: ethers.Signer =
    await transformContext.services.accounts.getSigner(vertex.from);

  return {
    type: "LibraryDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact: vertex.artifact,
    args: await convertArgs(vertex.args, transformContext),
    signer,
  };
}

async function convertAwaitToAwaitedEvent(
  vertex: EventVertex,
  transformContext: TransformContext
): Promise<AwaitedEventExecutionVertex> {
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
): Promise<SentETHExecutionVertex> {
  const signer: ethers.Signer =
    await transformContext.services.accounts.getSigner(vertex.from);

  return {
    type: "SentETH",
    id: vertex.id,
    label: vertex.label,
    address: vertex.address,
    value: (await resolveParameter(
      vertex.value,
      transformContext
    )) as BigNumber,
    signer,
  };
}

async function convertArgs(
  args: InternalParamValue[],
  transformContext: TransformContext
): Promise<ArgValue[]> {
  const resolvedArgs = [];

  for (const arg of args) {
    const resolvedArg = await resolveParameter(arg, transformContext);

    resolvedArgs.push(resolvedArg);
  }

  return resolvedArgs;
}

async function resolveParameter<T extends DeploymentGraphFuture>(
  arg: ExternalParamValue | T,
  { services, graph }: TransformContext
): Promise<ArgValue> {
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
        throw new IgnitionError(
          `No parameters object provided to deploy options, but module requires parameter "${arg.label}"`
        );
      case "param-missing":
        throw new IgnitionError(`No parameter provided for "${arg.label}"`);
    }
  }

  return services.config.getParam(arg.label);
}
