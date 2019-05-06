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
      { text: "Guides", link: "/guides/#getting-started" },
      { text: "Documentation", link: "/documentation/" },
      { text: "API", link: "/api/" },
      { text: "Nomic Labs", link: "https://nomiclabs.io" }
    ],
    lastUpdated: true,
    repo: "nomiclabs/buidler",
    docsDir: "docs",
    docsBranch: "master",
    editLinkText: "Help us improve this page!",
    editLinks: true,
    sidebar: {
      '/guides/': [{
        title: "Guides",
        collapsable: false,
        children: [
          '/guides/',
          'create-task',
          'create-plugin',
          'truffle-migration'
        ]
      }],
      '/documentation/': {
        sidebar: 'auto'
      }
    }
  },
  head: [
    ['meta ', { name: 'Cache-Control', content: 'public, max-age=0, must-revalidate' }]
  ]
};
