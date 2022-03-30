import { MenuItemType, SocialsEnum } from "./components/ui/types";

export const defaultMenuItemsList: MenuItemType[] = [
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

export enum Tools {
  RUNNER = "RUNNER",
  IGNITION = "IGNITION",
  NETWORK = "NETWORK",
  VS_CODE = "VS_CODE",
}

export const SOCIALS_LINKS = {
  [SocialsEnum.GITHUB]: "https://github.com/NomicFoundation/hardhat",
  [SocialsEnum.TWITTER]: "https://twitter.com/HardhatHQ",
  [SocialsEnum.DISCORD]: "https://discord.com/invite/TETZs2KK4k",
};

export const BANNER_LINK =
  "https://www.notion.so/Nomic-Foundation-jobs-991b37c547554f75b89a95f437fd5056";
