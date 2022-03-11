export interface SerializableNodeState {
  storage: { [key: string]: any };

  // timestamp is stored so that contracts do not get confused because of going back in time
  minTimestamp: number;
}
