export const BUILTIN_OPTIONS: Array<{
  name: string;
  description: string;
}> = [
  {
    name: "--config",
    description: "A Hardhat config file.",
  },
  {
    name: "--help",
    description: "Shows this message, or a task's help if its name is provided",
  },
  {
    name: "--show-stack-traces",
    description: "Show stack traces (always enabled on CI servers).",
  },
  {
    name: "--version",
    description: "Shows hardhat's version.",
  },
];
