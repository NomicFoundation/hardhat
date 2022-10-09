import type {
  VertexGraph,
  VertexDescriptor,
} from "@nomicfoundation/ignition-core";

function getVertexes(graph: VertexGraph): VertexDescriptor[] {
  return [...graph.vertexes.values()];
}

function plural(s: string, n: number): string {
  return `${s}${n === 1 ? "" : "s"}`;
}

function li(s: string): string {
  return `<li>${s}</li>`;
}

export function getTxTotal(graph: VertexGraph): string {
  const vertexes = getVertexes(graph);

  const length = vertexes.length;

  return `${length} ${plural("transaction", length)}`;
}

export function getSummaryLists(graph: VertexGraph): string {
  const vertexes = getVertexes(graph);

  const deploys = [];
  const calls = [];
  for (const vertex of vertexes) {
    if (vertex.type === "HardhatContract") {
      deploys.push(li(vertex.label));
    } else if (vertex.type === "Call") {
      calls.push(li(vertex.label));
    }
  }

  return `
<div class="deploy-list pure-u-1-2">
  ${deploys.length} contract ${plural("deploy", deploys.length)}
  <ul>
    ${deploys.join("\n")}
  </ul>
</div>

<div class="call-list pure-u-1-2">
  ${calls.length} contract ${plural("call", calls.length)}
  <ul>
    ${calls.join("\n")}
  </ul>
</div>
`;
}

export function graphToMermaid(graph: VertexGraph, name: string): string {
  const vertexes = getVertexes(graph);

  const nodeDefinitions = vertexes
    .map((v) => `${v.id}["${v.label}"]`)
    .join("\n");

  const connectionDefinitions = graph
    .getEdges()
    .map(({ from, to }) => `${from} --> ${to}`)
    .join("\n");

  const linkDefinitions = vertexes
    .map((v) => `click ${v.id} "recipe/${v.id}.json" _self`)
    .join("\n");

  return `
flowchart
subgraph ${name}
direction TB
${nodeDefinitions}
${connectionDefinitions}
${linkDefinitions}
end
`;
}

export function wrapInMermaidDiv(text: string): string {
  return `
<div class="mermaid">
  ${text}
</div>
`;
}

export function getActions(graph: VertexGraph): string {
  const vertexes = getVertexes(graph);

  const items = vertexes.map((v) => {
    const type = v.type === "HardhatContract" ? "Deploy" : v.type;

    return `
<li onclick="window.location.assign('recipe/${v.id}.json')">
  Contract ${type} ${v.label}
</li>
`;
  });

  return `
<ul class="actions">
  ${items.join("\n")}
</ul>
`;
}

export function replacer(obj: { [k: string]: string }) {
  return (_: string, key: string) => obj[key];
}
