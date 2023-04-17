import {
  DeploymentGraphVertex,
  VertexDescriptor,
  VertexGraph,
} from "@ignored/ignition-core/soon-to-be-removed";

type DisplayType =
  | "deploy-contract"
  | "deploy-library"
  | "call"
  | "static-call"
  | "transfer"
  | "event";

export function parseType(v: VertexDescriptor): DisplayType {
  const depVertex = v as DeploymentGraphVertex;
  switch (depVertex.type) {
    case "HardhatContract":
    case "ArtifactContract":
    case "DeployedContract":
      return "deploy-contract";
    case "HardhatLibrary":
    case "ArtifactLibrary":
      return "deploy-library";
    case "Call":
      return "call";
    case "StaticCall":
      return "static-call";
    case "SendETH":
      return "transfer";
    case "Event":
      return "event";
    case "Virtual":
      throw new Error("Virtual vertex unexpected in plan");
  }
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

export function toTypeText(type: DisplayType) {
  switch (type) {
    case "deploy-contract":
      return "Contract deploy";
    case "deploy-library":
      return "Library deploy";
    case "call":
      return "Contract call";
    case "static-call":
      return "Static contract call";
    case "transfer":
      return "Transfer";
    case "event":
      return "Contract event";
  }
}

export function getActions(graph: VertexGraph): string {
  const vertexes = getVertexes(graph);

  const items = vertexes.map((v) => {
    const type = parseType(v);
    const typeText = toTypeText(type);

    return `
<li
  id="action-${type}-${v.id}"
  onclick="window.location.assign('module/${v.id}.html')"
>
  ${typeText} ${v.label}
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
  if (vertex?.args === undefined || vertex.args.length === 0) {
    return "None";
  }

  const items = vertex.args
    .map(
      (a: {
        defaultValue: string;
        _future: boolean;
        label: string;
        type: string;
        toString: () => string;
      }) => {
        return `<li>${
          a.defaultValue ??
          (a._future
            ? `Future &lt; ${a.label} &gt; ${
                a.type === "contract" ? "address" : a.type
              } parameter`
            : a.toString())
        }</li>`;
      }
    )
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
