import { assert } from "chai";

import {
  constructEmptyAdjacencyList,
  addEdge,
  getDependenciesFor,
  clone,
  topologicalSort,
} from "../../../src/single-graph/utils/adjacencyList";

describe("Adjacency list", () => {
  it("should allow looking up deps for a two node graph", () => {
    const adjacencyList = constructEmptyAdjacencyList();

    addEdge(adjacencyList, { from: 0, to: 1 });

    assert.deepStrictEqual(getDependenciesFor(adjacencyList, 1), [0]);
  });

  it("should allow looking up single deps for a three node graph", () => {
    const adjacencyList = constructEmptyAdjacencyList();

    addEdge(adjacencyList, { from: 0, to: 1 });
    addEdge(adjacencyList, { from: 1, to: 2 });

    assert.deepStrictEqual(getDependenciesFor(adjacencyList, 2), [1]);
  });

  it("should allow looking up multiple deps for a three node graph", () => {
    const adjacencyList = constructEmptyAdjacencyList();

    addEdge(adjacencyList, { from: 0, to: 2 });
    addEdge(adjacencyList, { from: 1, to: 2 });

    assert.deepStrictEqual(getDependenciesFor(adjacencyList, 2), [0, 1]);
  });

  it("should be clonable", () => {
    const adjacencyList = constructEmptyAdjacencyList();

    addEdge(adjacencyList, { from: 0, to: 2 });
    addEdge(adjacencyList, { from: 1, to: 2 });

    const clonedList = clone(adjacencyList);

    assert.deepStrictEqual(clonedList, adjacencyList);
  });

  it("should do a topological sort", () => {
    const adjacencyList = constructEmptyAdjacencyList();

    addEdge(adjacencyList, { from: 0, to: 2 });
    addEdge(adjacencyList, { from: 1, to: 2 });

    const order = topologicalSort(adjacencyList);

    assert.deepStrictEqual(order, [1, 0, 2]);
  });
});
