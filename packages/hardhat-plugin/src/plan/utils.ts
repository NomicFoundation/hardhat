import type { VertexGraph } from "@nomicfoundation/ignition-core";

export function graphToMermaid(graph: VertexGraph, path: string): string {
  const vertexes = [...graph.vertexes.values()];

  const nodeDefinitions = vertexes.map((v) => `${v.id}[${v.label}]`).join("\n");

  const connectionDefinitions = graph
    .getEdges()
    .map(({ from, to }) => `${from} --> ${to}`)
    .join("\n");

  const linkDefinitions = vertexes
    .map((v) => `click ${v.id} "${path}/${v.id}.json" _self`)
    .join("\n");

  return `${nodeDefinitions}\n${connectionDefinitions}\n${linkDefinitions}`;
}

const div = `
<div class="mermaid">
  $
</div>
`;

export function wrapInMermaidDiv(text: string): string {
  return div.replace("$", text);
}

const flowchart = `
flowchart
subgraph $1
direction TB
$2
end
`;

export function wrapInFlowchart(name: string, text: string): string {
  return flowchart.replace("$1", name).replace("$2", text);
}
