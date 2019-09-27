module.exports = {
  title: "Buidler",
  description: "Buidler is a task runner for Ethereum smart contract developers.",
  serviceWorker: false,
  ga: 'UA-117668706-2',
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "Plugins", link: "/plugins/"},
      { text: "Documentation", link: "/documentation/" },
      { text: "API", link: "/api/" }
    ],
    lastUpdated: true,
    repo: "nomiclabs/buidler",
    docsDir: "docs",
    docsBranch: "master",
    editLinkText: "Help us improve this page!",
    editLinks: true,
    sidebar: [
      {
        title: "Getting Started",
        collapsable: false,
        children: [
          ['/documentation/#overview', 'Overview'],
          ['/documentation/#installation', 'Installation'],
          ['/documentation/#quick-start', 'Quick start']
        ]
      }, {
        title: "Guides",
        collapsable: false,
        children: [
          ['/guides/project-setup.md', 'Setting up a project'],
          ['/guides/compile-contracts.md', 'Compiling your contracts'],
          ['/guides/truffle-migration.md', 'Migrating from Truffle'],
          ['/guides/truffle-testing.md', 'Testing with Truffle'],
          ['/guides/waffle-testing.md', 'Testing with ethers.js & Waffle'],
          ['/guides/ethers-testing.md', 'Testing with ethers.js'],
          ['/guides/ganache-tests.md', 'Running tests on ganache'],
          ['/guides/vscode-tests.md', 'Running tests on VS Code'],
          ['/guides/deploying.md', 'Deploying your contracts'],
          ['/guides/create-task.md', 'Creating a task'],
          ['/guides/scripts.md', 'Writing scripts'],
          ['/guides/buidler-console.md', 'Using the Buidler console'],
          ['/guides/typescript.md', 'TypeScript support'],
          ['/guides/troubleshooting.md', 'Troubleshooting'],
        ]
      }, {
        title: "Reference",
        collapsable: false,
        children: [
          ['/reference/buidlerevm.md', 'Buidler EVM'],
          ['/reference/plugins.md', 'Plugins'],
          ['/reference/#configuration', 'Configuration'],
          ['/reference/#buidler-runtime-environment-bre', 'Buidler Runtime Environment (BRE)'],
          ['/reference/#building-plugins', 'Building plugins'],
          ['/reference/#stack-traces', 'Stack traces'],
          ['/reference/#verbose-logging', 'Verbose logging'],
        ]
      }
    ]
  },
  head: [
    ['meta ', { name: 'Cache-Control', content: 'public, max-age=0, must-revalidate' }]
  ]
};
