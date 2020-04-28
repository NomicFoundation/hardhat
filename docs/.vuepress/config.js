const defaultSlugify = require("@vuepress/shared-utils/lib/slugify");
const plugins = require("./plugins.js");
const pluginsChildren = [];

plugins.forEach(plugin => {
  let readmePath =
    "/plugins/" + plugin.name.replace("/", "-").replace(/^@/, "") + ".md";

  pluginsChildren.push([readmePath, plugin.name, 0]);
});

module.exports = {
  title: "Buidler",
  description:
    "Buidler is a task runner for Ethereum smart contract developers.",
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "Buidler EVM", link: "/buidler-evm/" },
      { text: "Plugins", link: "/plugins/" },
      { text: "Documentation", link: "/getting-started/" },
      { text: "Tutorial", link: "/tutorial/" },
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
    sidebar: {
      '/tutorial/': [
        {
          title: "Tutorial",
          collapsable: false,
          depth: 1,
          children: [
            ["", "1. Overview", 1],
            ["setting-up-the-environment.md", "2. Setting up the environment", 0],
            ["creating-a-new-buidler-project.md", "3. Creating a new Buidler project", 0],
            ["writing-and-compiling-contracts.md", "4. Writing and compiling contracts", 0],
            ["testing-contracts.md", "5. Testing contracts", 0],
            ["debugging-with-buidler-evm.md", "6. Debugging with Buidler EVM", 0],
            ["deploying-to-a-live-network.md", "7. Deploying to a live network", 0],
            ["hackathon-boilerplate-project.md", "8. Hackathon Boilerplate Project", 0],
            ["final-thoughts.md", "9. Final thoughts", 0],
          ]
        },
      ],
      '/': [
        ["/getting-started/", "Getting Started", 1],
        ["/config/", "Configuration", 0],
        ["/buidler-evm/", "Buidler EVM", 0],
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
    }
  },
  head: [
    [
      "meta",
      { name: "Cache-Control", content: "public, max-age=0, must-revalidate" }
    ],

    ["link", { rel: "shortcut icon", href: "/favicon.ico" }],
    ["link", { rel: "icon", sizes: "16x16 32x32 64x64", href: "/favicon.ico" }],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "196x196",
        href: "/favicon-192.png"
      }
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "160x160",
        href: "/favicon-160.png"
      }
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "96x96",
        href: "/favicon-96.png"
      }
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "64x64",
        href: "/favicon-64.png"
      }
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32.png"
      }
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16.png"
      }
    ],
    ["link", { rel: "apple-touch-icon", href: "/favicon-57.png" }],
    [
      "link",
      { rel: "apple-touch-icon", sizes: "114x114", href: "/favicon-114.png" }
    ],
    [
      "link",
      { rel: "apple-touch-icon", sizes: "72x72", href: "/favicon-72.png" }
    ],
    [
      "link",
      { rel: "apple-touch-icon", sizes: "144x144", href: "/favicon-144.png" }
    ],
    [
      "link",
      { rel: "apple-touch-icon", sizes: "60x60", href: "/favicon-60.png" }
    ],
    [
      "link",
      { rel: "apple-touch-icon", sizes: "120x120", href: "/favicon-120.png" }
    ],
    [
      "link",
      { rel: "apple-touch-icon", sizes: "76x76", href: "/favicon-76.png" }
    ],
    [
      "link",
      { rel: "apple-touch-icon", sizes: "152x152", href: "/favicon-152.png" }
    ],
    [
      "link",
      { rel: "apple-touch-icon", sizes: "180x180", href: "/favicon-180.png" }
    ],
    ["meta", { name: "msapplication-TileColor", content: "#FFFFFF" }],
    ["meta", { name: "msapplication-TileImage", content: "/favicon-144.png" }],
    ["meta", { name: "msapplication-config", content: "/browserconfig.xml" }]
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
  },
  plugins: [
    ['@vuepress/google-analytics', { ga: "UA-117668706-2" }],
    ['vuepress-plugin-container', {
      type: 'tip',
      defaultTitle: {
        '/': 'TIP',
        '/zh/': '提示',
      },
    }]
  ]
};