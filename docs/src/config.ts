import { MenuItemType, SocialsEnum } from "./components/ui/types";
import GitHubLogo from "./assets/socials/gh-logo";
import TwitterLogo from "./assets/socials/tw-logo";
import DiscordLogo from "./assets/socials/dc-logo";

const SOCIALS_LINKS = {
  [SocialsEnum.GITHUB]: "https://github.com/NomicFoundation/hardhat",
  [SocialsEnum.TWITTER]: "https://twitter.com/HardhatHQ",
  [SocialsEnum.DISCORD]: "https://discord.com/invite/TETZs2KK4k",
};

const BANNER_LINK =
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
    label: "Documents",
    href: "/getting-started",
  },
  {
    label: "Tutorial",
    href: "/tutorial",
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
