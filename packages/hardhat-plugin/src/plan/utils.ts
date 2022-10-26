import type { VertexGraph, VertexDescriptor } from "@ignored/ignition-core";

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

function wrapNode(v: VertexDescriptor): string {
  const text = `"${v.label}"`;
  return v.type === "HardhatContract"
    ? `${v.id}[${text}]:::deploy-${v.id}`
    : `${v.id}{{${text}}}:::call-${v.id}`;
}

export function graphToMermaid(graph: VertexGraph): string {
  const vertexes = getVertexes(graph);

  const nodeDefinitions = vertexes.map(wrapNode).join("\n");

  const connectionDefinitions = graph
    .getEdges()
    .map(({ from, to }) => `${from} --> ${to}`)
    .join("\n");

  const linkDefinitions = vertexes
    .map((v) => `click ${v.id} "recipe/${v.id}.html" _self`)
    .join("\n");

  return `
flowchart
${nodeDefinitions}
${connectionDefinitions}
${linkDefinitions}
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
<li
  id="action-${type.toLowerCase()}-${v.id}"
  onclick="window.location.assign('recipe/${v.id}.html')"
>
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

export function getParams(vertex: VertexDescriptor): string {
  if (!vertex?.args || vertex.args.length === 0) {
    return "None";
  }

  const items = vertex.args
    .map((a: any) => {
      return `<li>${
        a.defaultValue ?? a._future ? `Future &lt; ${a.label} &gt; address` : a
      }</li>`;
    })
    .join("\n");

  return `
<ul class="args">
  ${items}
</ul>
`;
}

export function replacer(obj: { [k: string]: string }) {
  return (_: string, key: string) => obj[key];
}
