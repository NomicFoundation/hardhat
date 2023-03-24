/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import {
  constructEmptyAdjacencyList,
  addEdge,
  getDependenciesFor,
  clone,
  topologicalSort,
  eliminate,
  ensureVertex,
} from "../../src/internal/graph/adjacencyList";

import { buildAdjacencyListFrom, constructAdjacencyList } from "./helpers";

describe("Adjacency list", () => {
  it("should allow looking up deps for a two node graph", () => {
    const adjacencyList = constructEmptyAdjacencyList();
    ensureVertex(adjacencyList, 0);
    ensureVertex(adjacencyList, 1);

    addEdge(adjacencyList, { from: 0, to: 1 });

    assert.deepStrictEqual(getDependenciesFor(adjacencyList, 1), [0]);
  });

  it("should allow looking up single deps for a three node graph", () => {
    const adjacencyList = constructEmptyAdjacencyList();
    ensureVertex(adjacencyList, 0);
    ensureVertex(adjacencyList, 1);
    ensureVertex(adjacencyList, 2);

    addEdge(adjacencyList, { from: 0, to: 1 });
    addEdge(adjacencyList, { from: 1, to: 2 });

    assert.deepStrictEqual(getDependenciesFor(adjacencyList, 2), [1]);
  });

  it("should allow looking up multiple deps for a three node graph", () => {
    const adjacencyList = constructEmptyAdjacencyList();
    ensureVertex(adjacencyList, 0);
    ensureVertex(adjacencyList, 1);
    ensureVertex(adjacencyList, 2);

    addEdge(adjacencyList, { from: 0, to: 2 });
    addEdge(adjacencyList, { from: 1, to: 2 });

    assert.deepStrictEqual(getDependenciesFor(adjacencyList, 2), [0, 1]);
  });

  it("should be clonable", () => {
    const adjacencyList = constructEmptyAdjacencyList();
    ensureVertex(adjacencyList, 0);
    ensureVertex(adjacencyList, 1);
    ensureVertex(adjacencyList, 2);

    addEdge(adjacencyList, { from: 0, to: 2 });
    addEdge(adjacencyList, { from: 1, to: 2 });

    const clonedList = clone(adjacencyList);

    assert.deepStrictEqual(clonedList, adjacencyList);
  });

  it("should do a topological sort", () => {
    const adjacencyList = constructEmptyAdjacencyList();
    ensureVertex(adjacencyList, 0);
    ensureVertex(adjacencyList, 1);
    ensureVertex(adjacencyList, 2);

    addEdge(adjacencyList, { from: 0, to: 2 });
    addEdge(adjacencyList, { from: 1, to: 2 });

    const order = topologicalSort(adjacencyList);

    assert.deepStrictEqual(order, [1, 0, 2]);
  });

  describe("eliminate", () => {
    it("should operate on a vertex with one out bound", () => {
      const adjacencyList = constructAdjacencyList([
        { from: 0, to: 1 },
        { from: 1, to: 2 },
      ]);

      const updated = eliminate(adjacencyList, 1);

      assert.deepStrictEqual(
        updated,
        buildAdjacencyListFrom({
          0: [2],
          2: [],
        })
      );
    });

    it("should operate on vertex with one dependent", () => {
      const adjacencyList = constructAdjacencyList([
        { from: 0, to: 1 },
        { from: 2, to: 3 },
      ]);

      const updated = eliminate(adjacencyList, 2);

      assert.deepStrictEqual(
        updated,
        buildAdjacencyListFrom({
          0: [1],
          1: [],
          3: [],
        })
      );
    });

    it("should operate on vertex with one dependency", () => {
      const adjacencyList = constructAdjacencyList([
        { from: 0, to: 1 },
        { from: 2, to: 3 },
      ]);

      const updated = eliminate(adjacencyList, 3);

      assert.deepStrictEqual(
        updated,
        buildAdjacencyListFrom({
          0: [1],
          1: [],
          2: [],
        })
      );
    });

    it("should operate on vertexes with many dependency", () => {
      const adjacencyList = constructAdjacencyList([
        { from: 0, to: 3 },
        { from: 1, to: 3 },
        { from: 2, to: 3 },
        { from: 3, to: 4 },
        { from: 3, to: 5 },
        { from: 3, to: 6 },
      ]);

      const updated = eliminate(adjacencyList, 3);

      assert.deepStrictEqual(
        updated,
        buildAdjacencyListFrom({
          0: [4, 5, 6],
          1: [4, 5, 6],
          2: [4, 5, 6],
          4: [],
          5: [],
          6: [],
        })
      );
    });
  });
});
