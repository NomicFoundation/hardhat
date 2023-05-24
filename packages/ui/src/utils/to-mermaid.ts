import {
  Future,
  FutureType,
  IgnitionModule,
  IgnitionModuleResult,
  StoredDeployment,
} from "@ignored/ignition-core/ui-helpers";
import { getAllFuturesForModule } from "../queries/futures";

export function toMermaid(deployment: StoredDeployment) {
  const modules = recursivelyListModulesAndSubmodulesFor(deployment.module);

  const subgraphSections = modules
    .map((m) => prettyPrintModule(m, "  "))
    .join("\n");

  const futureDependencies = [
    ...new Set(
      getAllFuturesForModule(deployment.module)
        .flatMap((f) => Array.from(f.dependencies).map((d) => [f.id, d.id]))
        .map(([from, to]) => `${from} --> ${to}`)
    ),
  ].join("\n");

  const moduleDependencies = [
    ...new Set(
      modules
        .flatMap((f) => Array.from(f.submodules).map((d) => [f.id, d.id]))
        .map(([from, to]) => `${from} -.-> ${to}`)
    ),
  ].join("\n");

  return `flowchart BT\n\n${deployment.module.id}:::startModule\n\n${subgraphSections}\n\n${futureDependencies}\n\n${moduleDependencies}\n\nclassDef startModule stroke-width:4px`;
}

function prettyPrintModule(
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>,
  lineIndent = ""
): string {
  const futureList = Array.from(module.futures)
    .map((f) => `${lineIndent}${f.id}["${toLabel(f)}"]`)
    .join(`\n${lineIndent}`);

  return `${lineIndent}subgraph ${module.id}\n${lineIndent}    direction BT\n\n${lineIndent}${lineIndent}${futureList}\n${lineIndent}end`;
}

function recursivelyListModulesAndSubmodulesFor(
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>
): Array<IgnitionModule<string, string, IgnitionModuleResult<string>>> {
  return [module].concat(
    Array.from(module.submodules).flatMap(
      recursivelyListModulesAndSubmodulesFor
    )
  );
}

function toLabel(f: Future): string {
  switch (f.type) {
    case FutureType.NAMED_CONTRACT_DEPLOYMENT:
      return `Deploy ${f.contractName}`;
    case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
      return `Deploy from artifact ${f.contractName}`;
    case FutureType.NAMED_LIBRARY_DEPLOYMENT:
      return `Deploy library ${f.contractName}`;
    case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
      return `Deploy library from artifact ${f.contractName}`;
    case FutureType.NAMED_CONTRACT_CALL:
      return `Call ${f.contract.contractName}/${f.functionName}`;
    case FutureType.NAMED_STATIC_CALL:
      return `Static call ${f.contract.contractName}/${f.functionName}`;
    case FutureType.NAMED_CONTRACT_AT:
      return `Existing contract ${f.contractName} (${
        typeof f.address === "string" ? f.address : f.address.id
      })`;
    case FutureType.ARTIFACT_CONTRACT_AT:
      return `Existing contract from artifact ${f.contractName} (${
        typeof f.address === "string" ? f.address : f.address.id
      })`;
    case FutureType.READ_EVENT_ARGUMENT:
      return `Read event from future ${f.futureToReadFrom.id} (event ${f.eventName} argument ${f.argumentName})`;
    case FutureType.SEND_DATA:
      return `Send data to ${typeof f.to === "string" ? f.to : f.to.id}`;
  }
}
