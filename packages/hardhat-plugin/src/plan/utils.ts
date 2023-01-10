import type { VertexGraph, VertexDescriptor } from "@ignored/ignition-core";

export function parseType(v: VertexDescriptor): string {
  let type: string;
  switch (v.type) {
    case "HardhatContract":
    case "ArtifactContract":
      type = "deploy";
      break;
    case "Call":
      type = "call";
      break;
    case "SendETH":
      type = "transfer";
      break;
    case "Event":
      type = "event";
      break;
    default:
      throw new Error(`Unknown vertex type: ${v.type}`);
  }

  return type;
}

function getVertexes(graph: VertexGraph): VertexDescriptor[] {
  return [...graph.vertexes.values()];
}

function plural(s: string, n: number): string {
  return `${s}${n === 1 ? "" : "s"}`;
}

function li(s: string): string {
  return `<li>${s}</li>`;
}

function ul(a: string[]): string {
  return `
  <ul>
    ${a.join("\n")}
  </ul>`;
}

export function getTxTotal(graph: VertexGraph): string {
  const vertexes = getVertexes(graph);

  const length = vertexes.length;

  return `${length} ${plural("transaction", length)}`;
}

export function getSummaryLists(graph: VertexGraph): string {
  const vertexes = getVertexes(graph);

  const obj: { [k: string]: string[] } = {};

  let cols = 0;
  for (const vertex of vertexes) {
    const type = parseType(vertex);

    if (obj[type] === undefined) {
      cols++;
      obj[type] = [];
    }

    obj[type].push(li(vertex.label));
  }

  const output = [];
  for (const [type, value] of Object.entries(obj)) {
    const item = `
<div class="${type}-list pure-u-1-${cols}">
  <b><u>${value.length} contract ${plural(type, value.length)}</u></b>
  ${ul(value)}
</div>
`;
    output.push(item);
  }

  return output.join("\n");
}

function wrapNode(v: VertexDescriptor): string {
  return `${v.id}[${v.label}]:::${parseType(v)}-${v.id}`;
}

export function graphToMermaid(graph: VertexGraph): string {
  const vertexes = getVertexes(graph);

  const nodeDefinitions = vertexes.map(wrapNode).join("\n");

  const connectionDefinitions = graph
    .getEdges()
    .map(({ from, to }) => `${from} --> ${to}`)
    .join("\n");

  const linkDefinitions = vertexes
    .map((v) => `click ${v.id} "module/${v.id}.html" _self`)
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
    const type = parseType(v);

    return `
<li
  id="action-${type}-${v.id}"
  onclick="window.location.assign('module/${v.id}.html')"
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
        a.defaultValue ?? a._future
          ? `Future &lt; ${a.label} &gt; ${
              a.type === "contract" ? "address" : a.type
            } parameter`
          : a
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
