import { assertIgnitionInvariant } from "./assertions.js";

export class AdjacencyList {
  /**
   * A mapping from futures to each futures dependencies.
   *
   * Example:
   *     A
   *    ^ ^
   *    | |
   *    B C
   * Gives a mapping of {A: [], B: [A], C:[A]}
   *
   */
  private readonly _list: Map<string, Set<string>> = new Map<
    string,
    Set<string>
  >();

  constructor(futureIds: string[]) {
    for (const futureId of futureIds) {
      this._list.set(futureId, new Set<string>());
    }
  }

  /**
   * Add a dependency from `from` to `to`. If A depends on B
   * then {`from`: A, `to`: B} should be passed.
   */
  public addDependency({ from, to }: { from: string; to: string }): void {
    const toSet = this._list.get(from) ?? new Set<string>();

    toSet.add(to);

    this._list.set(from, toSet);
  }

  public deleteDependency({ from, to }: { from: string; to: string }): void {
    const toSet = this._list.get(from) ?? new Set<string>();

    toSet.delete(to);

    this._list.set(from, toSet);
  }

  /**
   * Get the dependencies, if A depends on B, A's dependencies includes B
   * @param from - the future to get the list of dependencies for
   * @returns - the dependencies
   */
  public getDependenciesFor(from: string): Set<string> {
    return this._list.get(from) ?? new Set<string>();
  }

  /**
   * Get the dependents, if A depends on B, B's dependents includes A
   * @param from - the future to get the list of dependents for
   * @returns - the dependents
   */
  public getDependentsFor(to: string): string[] {
    return [...this._list.entries()]
      .filter(([_from, toSet]) => toSet.has(to))
      .map(([from]) => from);
  }

  /**
   * Remove a future, transfering its dependencies to its dependents.
   * @param futureId - The future to eliminate
   */
  public eliminate(futureId: string): void {
    const dependents = this.getDependentsFor(futureId);
    const dependencies = this.getDependenciesFor(futureId);

    this._list.delete(futureId);

    for (const dependent of dependents) {
      const toSet = this._list.get(dependent);

      assertIgnitionInvariant(
        toSet !== undefined,
        "Dependency sets should be defined"
      );

      const setWithoutFuture = new Set<string>(
        [...toSet].filter((n) => n !== futureId)
      );

      const updatedSet = new Set<string>([
        ...setWithoutFuture,
        ...dependencies,
      ]);

      this._list.set(dependent, updatedSet);
    }
  }

  public static topologicalSort(original: AdjacencyList): string[] {
    const newList = this.clone(original);

    if (newList._list.size === 0) {
      return [];
    }

    // Empty list that will contain the sorted elements
    let l: string[] = [];
    // set of all nodes with no dependents
    const s = new Set<string>(
      [...newList._list.keys()].filter(
        (fid) => newList.getDependentsFor(fid).length === 0
      )
    );

    while (s.size !== 0) {
      const n = [...s].pop();
      s.delete(n!);
      l = [...l, n!];
      for (const m of newList.getDependenciesFor(n!)) {
        newList.deleteDependency({ from: n!, to: m });

        if (newList.getDependentsFor(m).length === 0) {
          s.add(m);
        }
      }
    }

    return l;
  }

  public static clone(original: AdjacencyList): AdjacencyList {
    const newList: AdjacencyList = new AdjacencyList([
      ...original._list.keys(),
    ]);

    for (const [from, toSet] of original._list.entries()) {
      newList._list.set(from, new Set<string>(toSet));
    }

    return newList;
  }
}
