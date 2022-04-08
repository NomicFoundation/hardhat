import { IDocumentationSidebarStructure } from "./components/types";
import { MenuItemType, SocialsEnum } from "./components/ui/types";
import GitHubLogo from "./assets/socials/gh-logo";
import TwitterLogo from "./assets/socials/tw-logo";
import DiscordLogo from "./assets/socials/dc-logo";

export const SOCIALS_LINKS = {
  [SocialsEnum.GITHUB]: "https://github.com/NomicFoundation/hardhat",
  [SocialsEnum.TWITTER]: "https://twitter.com/HardhatHQ",
  [SocialsEnum.DISCORD]: "https://discord.com/invite/TETZs2KK4k",
};

export const BANNER_LINK =
  "https://www.notion.so/Nomic-Foundation-jobs-991b37c547554f75b89a95f437fd5056";

export const bannerContent = {
  text: "Join the Hardhat team! Nomic Labs is hiring",
  href: BANNER_LINK,
};

export const menuItemsList: MenuItemType[] = [
  {
    label: "Home",
    href: "/",
  },
  /**
   * We don't have this section yet
   */
  // {
  //   label: "Tools",
  //   href: "/tools",
  //   subItems: [
  //     {
  //       prefix: "Hardhat",
  //       label: "Runner",
  //       href: "/tools/runner",
  //     },
  //     {
  //       prefix: "Hardhat",
  //       label: "Ignition",
  //       href: "/tools/ignition",
  //     },
  //     {
  //       prefix: "Hardhat",
  //       label: "Network",
  //       href: "/tools/network",
  //     },
  //     {
  //       prefix: "Hardhat",
  //       label: "Solidity",
  //       href: "/tools/solidity",
  //     },
  //   ],
  // },
  {
    label: "Plugins",
    href: "/plugins",
  },
  {
    label: "Documentation",
    href: "/getting-started",
  },
  {
    label: "Tutorial",
    href: "/tutorial",
  },
];

export enum Tools {
  RUNNER = "RUNNER",
  IGNITION = "IGNITION",
  NETWORK = "NETWORK",
  VS_CODE = "VS_CODE",
}

export const DocumentationSidebarStructure: IDocumentationSidebarStructure = [
  {
    label: "Getting started",
    href: "/getting-started",
    type: "default",
    children: [
      {
        label: "Overview",
        href: "/getting-started#overview",
      },
      {
        label: "Installation",
        href: "/getting-started#installation",
      },
      {
        label: "Quick start",
        href: "/getting-started#quick-start",
      },
    ],
  },
  {
    label: "Configuration",
    href: "/config",
    type: "default",
  },
  {
    label: "Hardhat Network",
    type: "group",
    children: [
      {
        label: "What is it?",
        href: "/hardhat-network",
      },
      {
        label: "Mainnet Forking",
        href: "/hardhat-network/guides/mainnet-forking",
      },
      {
        label: "Mining Modes",
        href: "/hardhat-network/explanation/mining-modes",
      },
      {
        label: "Reference",
        href: "/hardhat-network/reference",
      },
    ],
  },
  {
    label: "Guides",
    type: "group",
    children: [
      {
        label: "Settings up a project",
        href: "/guides/project-setup",
      },
      {
        label: "Compiling your contracts",
        href: "/guides/compile-contracts",
      },
      {
        label: "Testing with ethers.js & Waffle",
        href: "/guides/waffle-testing",
      },
      {
        label: "Testing with Web3.js & Truffle",
        href: "/guides/truffle-testing",
      },
      {
        label: "Running tests in parallel",
        href: "/guides/parallel-tests",
      },
      {
        label: "Migrating from Truffle",
        href: "/guides/truffle-migration",
      },
      {
        label: "Deploying your contracts",
        href: "/guides/deploying",
      },
      {
        label: "Writing scripts with Hardhat",
        href: "/guides/scripts",
      },
      {
        label: "Using the Hardhat console",
        href: "/guides/hardhat-console",
      },
      {
        label: "Creating a task",
        href: "/guides/create-task",
      },
      {
        label: "Running tests with Ganache",
        href: "/guides/ganache-tests",
      },
      {
        label: "Running tests on Visual Studio Code",
        href: "/guides/vscode-tests",
      },
      {
        label: "TypeScript Support",
        href: "/guides/typescript",
      },
      {
        label: "Shorthand (hh) and autocomplete",
        href: "/guides/shorthand",
      },
    ],
  },
  {
    label: "Advanced",
    type: "group",
    children: [
      {
        label: "Hardhat Runtime Environment (HRE)",
        href: "/advanced/hardhat-runtime-environment",
      },
      {
        label: "Building plugins",
        href: "/advanced/building-plugins",
      },
      {
        label: "Migrating a Buidler plugin",
        href: "/advanced/migrating-buidler-plugin",
      },
    ],
  },
  {
    label: "Troubleshooting",
    type: "group",
    children: [
      {
        label: "Verbose logging",
        href: "/troubleshooting/verbose-logging",
      },
      {
        label: "Common problems",
        href: "/troubleshooting/common-problems",
      },
      {
        label: "Error codes",
        href: "/errors",
      },
    ],
  },
  {
    label: "Reference",
    type: "group",
    children: [
      {
        label: "Stability guarantees",
        href: "/reference/stability-guarantees",
      },
      {
        label: "Solidity support",
        href: "/reference/solidity-support",
      },
    ],
  },
  {
    label: "Buidler documentation",
    href: "/buidler-documentation",
    type: "default",
  },
  {
    label: "Plugins",
    type: "group",
    children: [
      {
        label: "@nomiclabs/hardhat-ethers",
        href: "/plugins/nomiclabs-hardhat-ethers",
      },
      {
        label: "@nomiclabs/hardhat-waffle",
        href: "/plugins/nomiclabs-hardhat-waffle",
      },
      {
        label: "@nomiclabs/hardhat-etherscan",
        href: "/plugins/nomiclabs-hardhat-etherscan",
      },
      {
        label: "@nomiclabs/hardhat-web3",
        href: "/plugins/nomiclabs-hardhat-web3",
      },
      {
        label: "@nomiclabs/hardhat-truffle5",
        href: "/plugins/nomiclabs-hardhat-truffle5",
      },
      {
        label: "@nomiclabs/hardhat-solhint",
        href: "/plugins/nomiclabs-hardhat-solhint",
      },
      {
        label: "@nomiclabs/hardhat-ganache",
        href: "/plugins/nomiclabs-hardhat-ganache",
      },
      {
        label: "@nomiclabs/hardhat-solpp",
        href: "/plugins/nomiclabs-hardhat-solpp",
      },
      {
        label: "@nomiclabs/hardhat-vyper",
        href: "/plugins/nomiclabs-hardhat-vyper",
      },
      {
        label: "@nomiclabs/hardhat-truffle4",
        href: "/plugins/nomiclabs-hardhat-truffle4",
      },
      {
        label: "@nomiclabs/hardhat-web3-legacy",
        href: "/plugins/nomiclabs-hardhat-web3-legacy",
      },
    ],
  },
  {
    label: "Community Plugins",
    href: "/plugins/#community-plugins",
    type: "default",
  },
];

export const socialsItems = [
  {
    name: SocialsEnum.GITHUB,
    href: SOCIALS_LINKS[SocialsEnum.GITHUB],
    Icon: GitHubLogo,
  },
  {
    name: SocialsEnum.TWITTER,
    href: SOCIALS_LINKS[SocialsEnum.TWITTER],
    Icon: TwitterLogo,
  },
  {
    name: SocialsEnum.DISCORD,
    href: SOCIALS_LINKS[SocialsEnum.DISCORD],
    Icon: DiscordLogo,
  },
];
