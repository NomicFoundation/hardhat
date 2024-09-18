export type NumberLike = number | bigint | string;

export type BlockTag = "latest" | "earliest" | "pending";

export type Fixture<T> = () => Promise<T>;

export interface SnapshotRestorer {
  /**
   * Resets the state of the blockchain to the point in which the snapshot was
   * taken.
   */
  restore(): Promise<void>;
  snapshotId: string;
}

export interface Snapshot<T> {
  restorer: SnapshotRestorer;
  fixture: Fixture<T>;
  data: T;
}
