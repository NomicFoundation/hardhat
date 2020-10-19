declare module "mnemonist/heap" {
  type HeapComparator<T> = (a: T, b: T) => number;

  export class MaxHeap<T> {

    // Members
    size: number;

    // Constructor
    constructor(comparator?: HeapComparator<T>);

    // Methods
    clear(): void;
    push(item: T): number;
    peek(): T | undefined;
    pop(): T | undefined;
    replace(item: T): T | undefined;
    pushpop(item: T): T | undefined;
    toArray(): Array<T>;
    consume(): Array<T>;
    inspect(): any;
  }
}
