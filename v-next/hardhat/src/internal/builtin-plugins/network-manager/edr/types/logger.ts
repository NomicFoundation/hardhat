export interface LoggerConfig {
  enabled: boolean;
  printLineFn?: (line: string) => void;
  replaceLastLineFn?: (line: string) => void;
}
