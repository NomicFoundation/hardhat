/* eslint-disable import/no-unused-modules */
import type { VertexGraph } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import {
  graphToMermaid,
  wrapInFlowchart,
  wrapInMermaidDiv,
} from "../../src/plan/utils";

describe("plan utils", () => {
  describe("graphToMermaid", () => {
    it("should convert a given graph to mermaid definitions", () => {
      const graph: VertexGraph = {
        vertexes: new Map([
          [0, { id: 0, label: "Foo" }],
          [1, { id: 1, label: "Bar" }],
        ]),
        adjacencyList: new Map([
          [0, new Set([1])],
          [1, new Set()],
        ]),
        getEdges() {
          return [{ from: 0, to: 1 }];
        },
      };

      assert.equal(
        graphToMermaid(graph, "test/path"),
        `0[Foo]
1[Bar]
0 --> 1
click 0 "test/path/0.json" _self
click 1 "test/path/1.json" _self`
      );
    });
  });

  describe("wrapInFlowchart", () => {
    it("should wrap given text in mermaid flowchart markup", () => {
      assert.equal(
        wrapInFlowchart("name", "text"),
        `
flowchart
subgraph name
direction TB
text
end
`
      );
    });
  });

  describe("wrapInMermaidDiv", () => {
    it("should wrap given text in mermaid html markup", () => {
      assert.equal(
        wrapInMermaidDiv("text"),
        `
<div class="mermaid">
  text
</div>
`
      );
    });
  });
});
