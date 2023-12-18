export interface Libraries<Address = string> {
  [libraryName: string]: Address;
}

export interface Link {
  sourceName: string;
  libraryName: string;
  address: string;
}
