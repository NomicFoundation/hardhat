import semver from "semver";

export interface SolidityCompilerOptimizer {
  viaIR: boolean;
  runs: number;
}

export interface SolidityCompiler {
  only?: boolean;
  solidityVersion: string;
  compilerPath: string;
  latestSolcVersion?: boolean;
  optimizer?: SolidityCompilerOptimizer;
}

export const solidityCompilers: SolidityCompiler[] = [
  // 0.5
  {
    solidityVersion: "0.5.1",
    compilerPath: "soljson-v0.5.1+commit.c8a2cb62.js",
  },
  {
    solidityVersion: "0.5.17",
    compilerPath: "soljson-v0.5.17+commit.d19bba13.js",
  },

  // 0.6
  {
    solidityVersion: "0.6.0",
    compilerPath: "soljson-v0.6.0+commit.26b70077.js",
  },
  {
    solidityVersion: "0.6.1",
    compilerPath: "soljson-v0.6.1+commit.e6f7d5a4.js",
  },
  {
    solidityVersion: "0.6.2",
    compilerPath: "soljson-v0.6.2+commit.bacdbe57.js",
  },
  // This version is enabled because it contains of a huge change in how
  // sourcemaps work
  {
    solidityVersion: "0.6.3",
    compilerPath: "soljson-v0.6.3+commit.8dda9521.js",
    latestSolcVersion: true,
  },
  {
    solidityVersion: "0.6.4",
    compilerPath: "soljson-v0.6.4+commit.1dca32f3.js",
  },
  {
    solidityVersion: "0.6.5",
    compilerPath: "soljson-v0.6.5+commit.f956cc89.js",
  },
  {
    solidityVersion: "0.6.6",
    compilerPath: "soljson-v0.6.6+commit.6c089d02.js",
  },
  {
    solidityVersion: "0.6.7",
    compilerPath: "soljson-v0.6.7+commit.b8d736ae.js",
  },
  {
    solidityVersion: "0.6.8",
    compilerPath: "soljson-v0.6.8+commit.0bbfe453.js",
  },
  {
    solidityVersion: "0.6.9",
    compilerPath: "soljson-v0.6.9+commit.3e3065ac.js",
  },
  {
    solidityVersion: "0.6.10",
    compilerPath: "soljson-v0.6.10+commit.00c0fcaf.js",
  },
  {
    solidityVersion: "0.6.11",
    compilerPath: "soljson-v0.6.11+commit.5ef660b1.js",
  },
  {
    solidityVersion: "0.6.12",
    compilerPath: "soljson-v0.6.12+commit.27d51765.js",
  },

  // 0.7
  {
    solidityVersion: "0.7.0",
    compilerPath: "soljson-v0.7.0+commit.9e61f92b.js",
  },
  {
    solidityVersion: "0.7.1",
    compilerPath: "soljson-v0.7.1+commit.f4a555be.js",
  },
  {
    solidityVersion: "0.7.4",
    compilerPath: "soljson-v0.7.4+commit.3f05b770.js",
  },
  {
    solidityVersion: "0.7.6",
    compilerPath: "soljson-v0.7.6+commit.7338295f.js",
    latestSolcVersion: true,
  },

  // 0.8
  {
    solidityVersion: "0.8.1",
    compilerPath: "soljson-v0.8.1+commit.df193b15.js",
  },
  {
    solidityVersion: "0.8.4",
    compilerPath: "soljson-v0.8.4+commit.c7e474f2.js",
  },
  {
    solidityVersion: "0.8.5",
    compilerPath: "soljson-v0.8.5+commit.a4f2e591.js",
  },
  {
    solidityVersion: "0.8.6",
    compilerPath: "soljson-v0.8.6+commit.11564f7e.js",
  },
  {
    solidityVersion: "0.8.7",
    compilerPath: "soljson-v0.8.7+commit.e28d00a7.js",
  },
  {
    solidityVersion: "0.8.8",
    compilerPath: "soljson-v0.8.8+commit.dddeac2f.js",
  },
  {
    solidityVersion: "0.8.9",
    compilerPath: "soljson-v0.8.9+commit.e5eed63a.js",
  },
  {
    solidityVersion: "0.8.10",
    compilerPath: "soljson-v0.8.10+commit.fc410830.js",
  },
  {
    solidityVersion: "0.8.11",
    compilerPath: "soljson-v0.8.11+commit.d7f03943.js",
  },
  {
    solidityVersion: "0.8.12",
    compilerPath: "soljson-v0.8.12+commit.f00d7308.js",
  },
  {
    solidityVersion: "0.8.13",
    compilerPath: "soljson-v0.8.13+commit.abaa5c0e.js",
  },
  {
    solidityVersion: "0.8.14",
    compilerPath: "soljson-v0.8.14+commit.80d49f37.js",
  },
  {
    solidityVersion: "0.8.15",
    compilerPath: "soljson-v0.8.15+commit.e14f2714.js",
  },
  {
    solidityVersion: "0.8.16",
    compilerPath: "soljson-v0.8.16+commit.07a7930e.js",
  },
  {
    solidityVersion: "0.8.17",
    compilerPath: "soljson-v0.8.17+commit.8df45f5f.js",
  },
  {
    solidityVersion: "0.8.17",
    compilerPath: "soljson-v0.8.17+commit.8df45f5f.js",
    optimizer: {
      runs: 200,
      viaIR: true,
    },
  },
  {
    solidityVersion: "0.8.18",
    compilerPath: "soljson-v0.8.18+commit.87f61d96.js",
  },
  {
    solidityVersion: "0.8.18",
    compilerPath: "soljson-v0.8.18+commit.87f61d96.js",
    optimizer: {
      runs: 200,
      viaIR: true,
    },
  },
  {
    solidityVersion: "0.8.19",
    compilerPath: "soljson-v0.8.19+commit.7dd6d404.js",
  },
  {
    solidityVersion: "0.8.19",
    compilerPath: "soljson-v0.8.19+commit.7dd6d404.js",
    optimizer: {
      runs: 200,
      viaIR: true,
    },
  },
  {
    solidityVersion: "0.8.20",
    compilerPath: "soljson-v0.8.20+commit.a1b79de6.js",
  },
  {
    solidityVersion: "0.8.20",
    compilerPath: "soljson-v0.8.20+commit.a1b79de6.js",
    optimizer: {
      runs: 200,
      viaIR: true,
    },
  },
  {
    solidityVersion: "0.8.21",
    compilerPath: "soljson-v0.8.21+commit.d9974bed.js",
  },
  {
    solidityVersion: "0.8.21",
    compilerPath: "soljson-v0.8.21+commit.d9974bed.js",
    optimizer: {
      runs: 200,
      viaIR: true,
    },
  },
  {
    solidityVersion: "0.8.22",
    compilerPath: "soljson-v0.8.22+commit.4fc1097e.js",
    latestSolcVersion: true,
  },
  {
    solidityVersion: "0.8.22",
    compilerPath: "soljson-v0.8.22+commit.4fc1097e.js",
    optimizer: {
      runs: 200,
      viaIR: true,
    },
    latestSolcVersion: true,
  },
  {
    solidityVersion: "0.8.23",
    compilerPath: "soljson-v0.8.23+commit.f704f362.js",
    latestSolcVersion: true,
  },
  {
    solidityVersion: "0.8.23",
    compilerPath: "soljson-v0.8.23+commit.f704f362.js",
    optimizer: {
      runs: 200,
      viaIR: true,
    },
    latestSolcVersion: true,
  },
  {
    solidityVersion: "0.8.24",
    compilerPath: "soljson-v0.8.24+commit.e11b9ed9.js",
    latestSolcVersion: true,
  },
  {
    solidityVersion: "0.8.24",
    compilerPath: "soljson-v0.8.24+commit.e11b9ed9.js",
    optimizer: {
      runs: 200,
      viaIR: true,
    },
    latestSolcVersion: true,
  },
];

export const getLatestSupportedVersion = () =>
  solidityCompilers.map((sc) => sc.solidityVersion).sort(semver.compare)[
    solidityCompilers.length - 1
  ];

export const getNextUnsupportedVersion = () =>
  semver.inc(getLatestSupportedVersion(), "patch")!;

export const getNextNextUnsupportedVersion = () =>
  semver.inc(getNextUnsupportedVersion(), "patch")!;
