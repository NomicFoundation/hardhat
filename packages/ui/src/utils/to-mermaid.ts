import {
  Future,
  FutureType,
  IgnitionModule,
  IgnitionModuleResult,
  isFuture,
} from "@nomicfoundation/ignition-core/ui-helpers";
import { getAllFuturesForModule } from "../queries/futures.js";
import { argumentTypeToString } from "./argumentTypeToString.js";

export function toMermaid(
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>
) {
  const modules = recursivelyListModulesAndSubmodulesFor(ignitionModule);

  const subgraphSections = modules
    .map((m) => prettyPrintModule(m, "  "))
    .join("\n");

  const futureDependencies = [
    ...new Set(
      getAllFuturesForModule(ignitionModule)
        .flatMap((f) =>
          Array.from(f.dependencies).map((d) => [
            toEscapedId(f.id),
            toEscapedId(d.id),
          ])
        )
        .map(([from, to]) => `${from} --> ${to}`)
    ),
  ].join("\n");

  const moduleDependencies = [
    ...new Set(
      modules
        .flatMap((f) =>
          Array.from(f.submodules).map((d) => [
            toEscapedId(f.id),
            toEscapedId(d.id),
          ])
        )
        .map(([from, to]) => `${from} -.-> ${to}`)
    ),
  ].join("\n");

  return `flowchart BT\n\n${toEscapedId(
    ignitionModule.id
  )}:::startModule\n\n${subgraphSections}${
    futureDependencies === "" ? "" : "\n\n" + futureDependencies
  }${
    moduleDependencies === "" ? "" : "\n\n" + moduleDependencies
  }\n\nclassDef startModule stroke-width:4px`;
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

function prettyPrintModule(
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>,
  lineIndent = ""
): string {
  const futureList = Array.from(module.futures)
    .map((f) => `${lineIndent}${toEscapedId(f.id)}["${toLabel(f)}"]`)
    .join(`\n${lineIndent}`);

  return `${lineIndent}subgraph ${module.id}\n${lineIndent}  direction BT\n\n${lineIndent}${futureList}\n${lineIndent}end`;
}

function toLabel(f: Future): string {
  switch (f.type) {
    case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
      return `Deploy ${f.contractName}`;
    case FutureType.CONTRACT_DEPLOYMENT:
      return `Deploy from artifact ${f.contractName}`;
    case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
      return `Deploy library ${f.contractName}`;
    case FutureType.LIBRARY_DEPLOYMENT:
      return `Deploy library from artifact ${f.contractName}`;
    case FutureType.CONTRACT_CALL:
      return `Call ${f.contract.contractName}/${f.functionName}`;
    case FutureType.STATIC_CALL:
      return `Static call ${f.contract.contractName}/${f.functionName}`;
    case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
      return `Existing contract ${f.contractName} (${
        typeof f.address === "string"
          ? f.address
          : isFuture(f.address)
          ? f.address.id
          : argumentTypeToString(f.address)
      })`;
    case FutureType.CONTRACT_AT:
      return `Existing contract from artifact ${f.contractName} (${
        typeof f.address === "string"
          ? f.address
          : isFuture(f.address)
          ? f.address.id
          : argumentTypeToString(f.address)
      })`;
    case FutureType.READ_EVENT_ARGUMENT:
      return `Read event from future ${f.futureToReadFrom.id} (event ${f.eventName} argument ${f.nameOrIndex})`;
    case FutureType.SEND_DATA:
      return `Send data to ${
        typeof f.to === "string"
          ? f.to
          : isFuture(f.to)
          ? f.to.id
          : argumentTypeToString(f.to)
      }`;
  }
}

function toEscapedId(id: string): string {
  return id
    .replace("(", "_")
    .replace(")", "_")
    .replace(",", "_")
    .replace(" ", "_");
}
