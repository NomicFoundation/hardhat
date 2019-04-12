module.exports = {
  title: "Buidler",
  description: "The extensible Solidity developer tool",
  serviceWorker: true,
  ga: 'UA-117668706-2',
  themeConfig: {
    logo: "logo.png",
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
  }
};
