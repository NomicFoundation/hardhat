const defaultSlugify = require("@vuepress/shared-utils/lib/slugify");
const plugins = require("./sorted-plugins.js");

const officialPlugins = plugins.officialPlugins.map((p) => [
  "/plugins/" + p.normalizedName + ".md",
  p.name,
  0,
]);

module.exports = {
  title:
    "Hardhat | Ethereum development environment for professionals by Nomic Labs",
  description:
    "Hardhat is an Ethereum development environment. Compile your contracts and run them on a development network. Get Solidity stack traces, console.log and more.",
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Home", link: "/" },
      // { text: "Hardhat Network", link: "/hardhat-network/" },
      { text: "Plugins", link: "/plugins/" },
      { text: "Documentation", link: "/getting-started/" },
      { text: "Tutorial", link: "/tutorial/" },
    ],
    lastUpdated: true,
    repo: "nomiclabs/hardhat",
    docsDir: "docs",
    docsBranch: "master",
    editLinkText: "Help us improve this page!",
    editLinks: true,
    sidebarDepth: 1,
    displayAllHeaders: true,
    sidebar: {
      "/tutorial/": [
        {
          title: "Tutorial",
          collapsable: false,
          depth: 1,
          children: [
            ["", "1. Overview", 1],
            [
              "setting-up-the-environment.md",
              "2. Setting up the environment",
              0,
            ],
            [
              "creating-a-new-hardhat-project.md",
              "3. Creating a new Hardhat project",
              0,
            ],
            [
              "writing-and-compiling-contracts.md",
              "4. Writing and compiling contracts",
              0,
            ],
            ["testing-contracts.md", "5. Testing contracts", 0],
            [
              "debugging-with-hardhat-network.md",
              "6. Debugging with Hardhat Network",
              0,
            ],
            [
              "deploying-to-a-live-network.md",
              "7. Deploying to a live network",
              0,
            ],
            [
              "hackathon-boilerplate-project.md",
              "8. Hackathon Boilerplate Project",
              0,
            ],
            ["final-thoughts.md", "9. Final thoughts", 0],
          ],
        },
      ],
      "/": [
        ["/getting-started/", "Getting Started", 1],
        ["/config/", "Configuration", 0],
        {
          title: "Hardhat Network",
          url: "/hardhat-network/",
          collapsable: false,
          depth: 1,
          children: [
            ["/hardhat-network/", "What is it?", 0],
            [
              "/hardhat-network/guides/mainnet-forking.md",
              "Mainnet Forking",
              0,
            ],
            ["/hardhat-network/explanation/mining-modes.md", "Mining Modes", 0],
            ["/hardhat-network/reference/", "Reference", 0],
          ],
        },
        {
          title: "Guides",
          url: "/guides/",
          collapsable: false,
          depth: 1,
          children: [
            ["/guides/project-setup.md", "Setting up a project", 0],
            ["/guides/compile-contracts.md", "Compiling your contracts", 0],
            ["/guides/waffle-testing.md", "Testing with ethers.js & Waffle", 0],
            ["/guides/truffle-testing.md", "Testing with Web3.js & Truffle", 0],
            ["/guides/truffle-migration.md", "Migrating from Truffle", 0],
            ["/guides/deploying.md", "Deploying your contracts", 0],
            ["/guides/scripts.md", "Writing scripts", 0],
            ["/guides/hardhat-console.md", "Using the Hardhat console", 0],
            ["/guides/create-task.md", "Creating a task", 0],
            ["/guides/ganache-tests.md", "Running tests with Ganache", 0],
            ["/guides/vscode-tests.md", "Running tests on VS Code", 0],
            ["/guides/typescript.md", "TypeScript support", 0],
            ["/guides/shorthand.md", "Shorthand (hh) and autocomplete", 0],
          ],
        },
        {
          title: "Advanced",
          collapsable: false,
          children: [
            [
              "/advanced/hardhat-runtime-environment.html",
              "Hardhat Runtime Environment (HRE)",
              0,
            ],
            ["/advanced/building-plugins.html", "Building plugins", 0],
            [
              "/advanced/migrating-buidler-plugin.html",
              "Migrating a Buidler plugin",
              0,
            ],
          ],
        },
        {
          title: "Troubleshooting",
          collapsable: false,
          children: [
            ["/troubleshooting/verbose-logging.html", "Verbose logging", 0],
            ["/troubleshooting/common-problems.html", "Common problems", 0],
            ["/errors/", "Error codes", 0],
          ],
        },
        {
          title: "Reference",
          collapsable: false,
          children: [
            ["/reference/stability-guarantees.html", "Stability guarantees", 0],
            ["/reference/solidity-support.html", "Solidity support", 0],
          ],
        },
        "/buidler-documentation.html",
        {
          title: "Plugins",
          collapsable: false,
          children: [
            ...officialPlugins,
            ["/plugins/#community-plugins", "Community plugins", 0],
          ],
        },
      ],
    },
    algolia: {
      apiKey: "70d2567dd1257c8a53bbb823a0085f02",
      indexName: "hardhat",
    },
  },
  head: [
    [
      "link",
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
    ],
    ["link", { rel: "manifest", href: "/site.webmanifest" }],
    ["meta", { name: "msapplication-config", content: "/browserconfig.xml" }],
    ["meta", { name: "msapplication-TileColor", content: "#ffffff" }],
    ["meta", { name: "theme-color", content: "#ffffff" }],
    ["link", { rel: "shortcut icon", href: "/favicon.ico" }],
    ["link", { rel: "icon", sizes: "16x16 32x32", href: "/favicon.ico" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ["meta", { name: "twitter:site", content: "@HardhatHQ" }],
    ["meta", { name: "twitter:creator", content: "@NomicLabs" }],
    [
      "meta",
      {
        name: "twitter:title",
        content: "Ethereum development environment for professionals",
      },
    ],
    [
      "meta",
      {
        name: "twitter:image",
        content: "https://hardhat.org/card.png",
      },
    ],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Compile, deploy, test and debug your Ethereum software. Get Solidity stack traces, console.log, mainnet forking and more.",
      },
    ],
    [
      "meta",
      {
        property: "og:title",
        content:
          "Ethereum development environment for professionals by Nomic Labs",
      },
    ],
    [
      "meta",
      {
        property: "og:image",
        content: "https://hardhat.org/card.png",
      },
    ],
    ["meta", { property: "og:image:width", content: "2400" }],
    ["meta", { property: "og:image:height", content: "1250" }],
  ],
  markdown: {
    slugify: (title) => {
      const buidlerErrorTitle = /(^BDLR\d+):/i;
      const hardhatErrorTitle = /(^HH\d+):/i;

      const matchBuidler = buidlerErrorTitle.exec(title);

      if (matchBuidler !== null) {
        return matchBuidler[1];
      }

      const matchHardhat = hardhatErrorTitle.exec(title);

      if (matchHardhat !== null) {
        return matchHardhat[1];
      }

      return defaultSlugify(title);
    },
  },
  plugins: [
    ["@vuepress/google-analytics", { ga: "UA-117668706-2" }],
    [
      "vuepress-plugin-container",
      {
        type: "tip",
        defaultTitle: {
          "/": "TIP",
        },
      },
    ],
    [
      "vuepress-plugin-container",
      {
        type: "warning",
        defaultTitle: {
          "/": "WARNING",
        },
      },
    ],
  ],
};
