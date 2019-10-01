const defaultSlugify = require("vuepress/lib/markdown/slugify");
const plugins = require("./plugins.js");
const pluginsChildren = [];

plugins.forEach(plugin => {
  let readmePath =
    "/plugins/" +
    plugin.name.replace("/", "-").replace(/^@/, "") +
    ".md";

  pluginsChildren.push([readmePath, plugin.name, 0]);
});

module.exports = {
  title: "Buidler",
  description:
    "Buidler is a task runner for Ethereum smart contract developers.",
  serviceWorker: false,
  ga: "UA-117668706-2",
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "Buidler EVM", link: "/buidler-evm/" },
      { text: "Plugins", link: "/plugins/" },
      { text: "Documentation", link: "/getting-started/" },
      { text: "API", link: "/api/" }
    ],
    lastUpdated: true,
    repo: "nomiclabs/buidler",
    docsDir: "docs",
    docsBranch: "master",
    editLinkText: "Help us improve this page!",
    editLinks: true,
    sidebarDepth: 1,
    displayAllHeaders: true,
    sidebar: [
      ["/getting-started/", "Getting Started", 1],
      ["/config/", "Configuration", 0],
      ["/buidler-evm/", "Buidler EVM", 0],
      {
        title: "Guides",
        url: "/guides/",
        collapsable: false,
        depth: 1,
        children: [
          ["/guides/truffle-migration.md", "Migrating from Truffle", 0],
          ["/guides/project-setup.md", "Setting up a project", 0],
          ["/guides/compile-contracts.md", "Compiling your contracts", 0],
          ["/guides/truffle-testing.md", "Testing with Web3.js & Truffle", 0],
          ["/guides/waffle-testing.md", "Testing with ethers.js & Waffle", 0],
          ["/guides/deploying.md", "Deploying your contracts", 0],
          ["/guides/scripts.md", "Writing scripts", 0],
          ["/guides/buidler-console.md", "Using the Buidler console", 0],
          ["/guides/create-task.md", "Creating a task", 0],
          ["/guides/ganache-tests.md", "Running tests with Ganache", 0],
          ["/guides/vscode-tests.md", "Running tests on VS Code", 0],
          ["/guides/typescript.md", "TypeScript support", 0]
        ]
      },
      {
        title: "Advanced",
        collapsable: false,
        children: [
          [
            "/advanced/buidler-runtime-environment.html",
            "Buidler Runtime Environment (BRE)",
            0
          ],
          ["/advanced/building-plugins.html", "Building plugins", 0]
        ]
      },
      {
        title: "Troubleshooting",
        collapsable: false,
        children: [
          ["/troubleshooting/verbose-logging.html", "Verbose logging", 0],
          ["/troubleshooting/common-problems.html", "Common problems", 0],
          ["/errors/", "Error codes", 0]
        ]
      },
      {
        title: "Plugins",
        collapsable: false,
        children: pluginsChildren
      }
    ]
  },
  head: [
    [
      "meta ",
      { name: "Cache-Control", content: "public, max-age=0, must-revalidate" }
    ]
  ],
  markdown: {
    slugify: title => {
      const errorTitle = /(^BDLR\d+):/;

      const match = errorTitle.exec(title);

      if (match !== null) {
        return match[1];
      }

      return defaultSlugify(title);
    }
  }
};
