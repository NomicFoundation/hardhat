export interface Location {
  line: number;
  column: number;
}

export interface Range {
  start: Location;
  end: Location;
}

export interface FunctionMapping {
  name: string;
  decl: Range;
  loc: Range;
  line: number;
}

export interface BranchMapping {
  loc: Range;
  type: string;
  locations: Range[];
  line: number;
}

export interface FileCoverageData {
  path: string;
  statementMap: { [key: string]: Range };
  fnMap: { [key: string]: FunctionMapping };
  branchMap: { [key: string]: BranchMapping };
  s: { [key: string]: number };
  f: { [key: string]: number };
  b: { [key: string]: number[] };
}
