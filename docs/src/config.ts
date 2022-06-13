import path from "path";
import {
  MenuItemType,
  NavigationPagesPaths,
  SocialsEnum,
} from "./components/ui/types";
import GitHubLogo from "./assets/socials/gh-logo";
import TwitterLogo from "./assets/socials/tw-logo";
import DiscordLogo from "./assets/socials/dc-logo";
// TODO: Re-enable tools section
import SolidityIcon from "./assets/tools/solidity";
import RunnerIcon from "./assets/tools/runner";
import IgnitionIcon from "./assets/tools/ignition";
import NetworkIcon from "./assets/tools/network";
import RunnerIconDark from "./assets/tools/runner-dark";
import IgnitionIconDark from "./assets/tools/ignition-dark";
import NetworkIconDark from "./assets/tools/network-dark";
import SolidityIconDark from "./assets/tools/solidity-dark";

export const SOCIALS_LINKS = {
  [SocialsEnum.GITHUB]: "https://github.com/NomicFoundation/hardhat",
  [SocialsEnum.TWITTER]: "https://twitter.com/HardhatHQ",
  [SocialsEnum.DISCORD]: "https://discord.com/invite/TETZs2KK4k",
};

export const BANNER_LINK =
  "https://www.notion.so/Nomic-Foundation-jobs-991b37c547554f75b89a95f437fd5056";

export const PRIVACY_POLICY_PATH = "/privacy-policy.html";

export const bannerContent = {
  text: "Join the Hardhat team! Nomic Foundation is hiring",
  shortText: "Join the Hardhat team! We are hiring",
  href: BANNER_LINK,
};

export const DOCS_PATH = path.join(process.cwd(), "src/content/");
export const PLUGINS_PATH = path.join(process.cwd(), "src/content/plugins");
export const TEMP_PATH = path.join(process.cwd(), "temp/");
// TODO: change this to "https://github.com/NomicFoundation/hardhat/edit/master/docs/src/content/" before publishing to production
export const REPO_URL =
  "https://github.com/NomicFoundation/hardhat/edit/master/docs/";

// Regular expression to find tool in query string.
export const toolRegExp = /tool=[A-Z_]+/;

export const menuItemsList: MenuItemType[] = [
  {
    label: "Home",
    href: NavigationPagesPaths.HOME,
  },
  // TODO: Re-enable tools section
  {
    label: "Tools",
    href: NavigationPagesPaths.TOOLS,
    subItems: [
      {
        prefix: "Hardhat",
        label: "Runner",
        href: "/?tool=RUNNER#tools",
        icon: RunnerIcon,
        iconDark: RunnerIconDark,
      },
      {
        prefix: "Hardhat",
        label: "Ignition",
        href: "/?tool=IGNITION#tools",
        icon: IgnitionIcon,
        iconDark: IgnitionIconDark,
      },
      {
        prefix: "Hardhat",
        label: "Network",
        href: "/?tool=NETWORK#tools",
        icon: NetworkIcon,
        iconDark: NetworkIconDark,
      },
      {
        prefix: "Hardhat",
        label: "Solidity",
        href: "/?tool=SOLIDITY#tools",
        icon: SolidityIcon,
        iconDark: SolidityIconDark,
      },
    ],
  },
  {
    label: "Plugins",
    href: NavigationPagesPaths.PLUGINS,
  },
  {
    label: "Documentation",
    href: NavigationPagesPaths.DOCUMENTATION,
  },
  {
    label: "Tutorial",
    href: NavigationPagesPaths.TUTORIAL,
  },
];

export enum Tools {
  RUNNER = "RUNNER",
  IGNITION = "IGNITION",
  NETWORK = "NETWORK",
  SOLIDITY = "SOLIDITY",
}

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

export enum DirInfoConfigKeys {
  SECTION_TYPE = "section-type",
  SECTION_TITLE = "section-title",
  ORDER = "order",
}

export enum LayoutsConfigKeys {
  TITLE = "title",
  FOLDERS = "folders",
}

export const GDPR = {
  title: "We value your privacy",
  text: "We use cookies to enhance your browsing experience and analyze our traffic. By clicking “Accept All”, you consent to our use of cookies.",
  readMoreHref: "/privacy-policy.html",
};
