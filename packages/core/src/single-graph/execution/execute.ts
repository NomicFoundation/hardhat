import { Journal } from "../../journal/types";
import { Providers } from "../../providers";
import { Services } from "../../services/types";
import { topologicalSort } from "../graph/adjacencyList";
import { createServices } from "../services/createServices";
import {
  ArgValue,
  ContractCall,
  ContractDeploy,
  DeployedContract,
  ExecutionVertex,
  IExecutionGraph,
  LibraryDeploy,
} from "../types/executionGraph";
import { isDependable } from "../utils/guards";

export type ExecuteResult =
  | {
      _kind: "success";
      result: Map<number, any>;
    }
  | {
      _kind: "failure";
      failures: [string, Error[]];
    };

export async function execute(
  executionGraph: IExecutionGraph,
  servicesOptions: {
    providers: Providers;
    journal: Journal;
    txPollingInterval: number;
  }
): Promise<ExecuteResult> {
  const services: Services = createServices(
    "recipeIdEXECUTE",
    "executorIdEXECUTE",
    servicesOptions
  );

  const resultContext: Map<number, any> = new Map<number, any>();

  const executionResults = await visit(
    executionGraph,
    resultContext,
    (executionVertex: ExecutionVertex, context: Map<number, any>) => {
      switch (executionVertex.type) {
        case "ContractDeploy":
          return executeContractDeploy(executionVertex, {
            ...services,
            context,
          });
        case "DeployedContract":
          return executeDeployedContract(executionVertex, {
            ...services,
            context,
          });
        case "ContractCall":
          return executeContractCall(executionVertex, {
            ...services,
            context,
          });
        case "LibraryDeploy":
          return executeLibraryDeploy(executionVertex, {
            ...services,
            context,
          });
        default:
          return assertUnknownExecutionVertexType(executionVertex);
      }
    }
  );

  return { _kind: "success", result: executionResults };
}

async function visit(
  executionGraph: IExecutionGraph,
  resultContext: Map<number, any>,
  vistitorAction: (
    executionVertex: ExecutionVertex,
    context: Map<number, any>
  ) => Promise<Map<number, any>>
) {
  for (const vertexId of topological(executionGraph)) {
    const vertex = executionGraph.vertexes.get(vertexId);

    if (vertex === undefined) {
      // this shouldn't happen
      continue;
    }

    const result = await vistitorAction(vertex, resultContext);

    resultContext.set(vertexId, result);
  }

  return resultContext;
}

function topological(executionGraph: IExecutionGraph): number[] {
  const orderedIds = topologicalSort(executionGraph.adjacencyList);

  const totalOrderedIds = Array.from(executionGraph.vertexes.keys())
    .filter((k) => !orderedIds.includes(k))
    .concat(orderedIds);

  return totalOrderedIds;
}

async function executeContractDeploy(
  { artifact, args, libraries }: ContractDeploy,
  services: Services & { context: Map<number, any> }
): Promise<any> {
  const resolve = resolveFromContext(services.context);

  const resolvedArgs = args.map(resolve).map(toAddress);

  const resolvedLibraries = Object.fromEntries(
    Object.entries(libraries ?? {}).map(([k, v]) => [k, toAddress(resolve(v))])
  );

  const txHash = await services.contracts.deploy(
    artifact,
    resolvedArgs,
    resolvedLibraries
  );

  const receipt = await services.transactions.wait(txHash);

  return {
    name: artifact.contractName,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    address: receipt.contractAddress,
  };
}

async function executeDeployedContract(
  { label, address, abi }: DeployedContract,
  _services: Services & { context: Map<number, any> }
): Promise<any> {
  return {
    name: label,
    abi,
    address,
  };
}

async function executeLibraryDeploy(
  { artifact, args }: LibraryDeploy,
  services: Services & { context: Map<number, any> }
): Promise<any> {
  const resolvedArgs = args
    .map(resolveFromContext(services.context))
    .map(toAddress);

  const txHash = await services.contracts.deploy(artifact, resolvedArgs, {});

  const receipt = await services.transactions.wait(txHash);

  return {
    name: artifact.contractName,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    address: receipt.contractAddress,
  };
}

async function executeContractCall(
  { method, contract, args }: ContractCall,
  services: Services & { context: Map<number, any> }
): Promise<any> {
  const resolve = resolveFromContext(services.context);

  const resolvedArgs = args.map(resolve).map(toAddress);

  const { address, abi } = resolve(contract);

  const txHash = await services.contracts.call(
    address,
    abi,
    method,
    resolvedArgs
  );

  await services.transactions.wait(txHash);

  return {
    hash: txHash,
  };
}

function toAddress(v: any) {
  if (typeof v === "object" && "address" in v) {
    return v.address;
  }

  return v;
}

function resolveFromContext(context: Map<number, any>) {
  return (arg: ArgValue) => {
    if (!isDependable(arg)) {
      return arg;
    }

    const entry = context.get(arg.vertexId);

    if (!entry) {
      throw new Error(`No context entry for ${arg.vertexId} (${arg.label})`);
    }

    return entry;
  };
}

function assertUnknownExecutionVertexType(
  executionVertex: never
): Promise<Map<number, any>> {
  const vertex = executionVertex as any;

  const forReport = "type" in vertex ? vertex.type : vertex;

  throw new Error(`Unknown execution vertex type: ${forReport}`);
}
