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
          ['/documentation/#quick-start', 'Quick start'],
          ['/documentation/#installation', 'Installation'],
          ['/documentation/#configuration', 'Configuration']
        ]
      }, {
        title: "Guides",
        collapsable: false,
        children: [
          ['/guides/create-project.md', 'Creating a project'],
          ['/guides/compile-contracts.md', 'Compiling your contracts'],
          ['/guides/truffle-testing.md', 'Testing with Truffle'],
          ['/guides/waffle-testing.md', 'Testing with Waffle'],
          ['/guides/ethers-testing.md', 'Testing with ethers.js'],
          ['/guides/ganache-tests.md', 'Running tests on ganache'],
          ['/guides/create-task.md', 'Creating a task'],
          ['/guides/scripts.md', 'Writing scripts'],
          ['/guides/buidler-console.md', 'Using the Buidler console'],
          ['/guides/typescript.md', 'TypeScript support'],
        ]
      }, {
        title: "Reference",
        collapsable: false,
        children: [
          ['/reference/using-bre.md', 'Using the Buidler Runtime Environment'],
          ['/reference/plugin-dev.md', 'Plugin development'],
          ['/reference/stack-traces.md', 'Stack traces'],
          ['/reference/verbose.md', 'Verbose logging'],
        ]
      }
    ]
  },
  head: [
    ['meta ', { name: 'Cache-Control', content: 'public, max-age=0, must-revalidate' }]
  ]
};
