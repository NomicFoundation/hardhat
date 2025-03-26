import path from "path";
import {
  MenuItemType,
  NavigationPagesPaths,
  SocialsEnum,
} from "./components/ui/types";
import GitHubLogo from "./assets/socials/gh-logo";
import TwitterLogo from "./assets/socials/tw-logo";
import DiscordLogo from "./assets/socials/dc-logo";
import SolidityIcon from "./assets/tools/solidity";
import RunnerIcon from "./assets/tools/runner";
import NetworkIcon from "./assets/tools/network";
import RunnerIconDark from "./assets/tools/runner-dark";
import NetworkIconDark from "./assets/tools/network-dark";
import SolidityIconDark from "./assets/tools/solidity-dark";
import IgnitionIcon from "./assets/tools/ignition";
import IgnitionIconDark from "./assets/tools/ignition-dark";

export const SOCIALS_LINKS = {
  [SocialsEnum.GITHUB]: "https://github.com/NomicFoundation/hardhat",
  [SocialsEnum.TWITTER]: "https://twitter.com/HardhatHQ",
  [SocialsEnum.DISCORD]: "/discord",
};

export const PRIVACY_POLICY_PATH = "/privacy-policy.html";

export const bannerContent = {
  text: "Hardhat 3 alpha: Rust rewrite, Solidity tests, multi-chain, and more!",
  shortText: "Try the Hardhat 3 alpha release!",
  href: "/hardhat3-alpha",
};

// export const bannerContent = {
//   text: "Please take a few minutes to complete the 2024 Solidity Survey",
//   shortText: "Complete the 2024 Solidity Survey here",
//   href: "https://hardhat.org/solidity-survey-2024",
// };

export const DOCS_PATH = path.join(process.cwd(), "src/content/");
export const DOCS_LANDING_PATH = path.join(
  process.cwd(),
  "src/content/docs-landing"
);
export const PLUGINS_PATH = path.join(
  process.cwd(),
  "src/content/hardhat-runner/plugins"
);
export const TEMP_PATH = path.join(process.cwd(), "temp/");
export const REPO_URL =
  "https://github.com/NomicFoundation/hardhat/edit/main/docs/src/content/";

// Regular expression to find tool in query string.
export const toolRegExp = /tool=[A-Z_]+/;

export const menuItemsList: MenuItemType[] = [
  {
    label: "Home",
    href: NavigationPagesPaths.HOME,
  },
  {
    label: "Tools",
    href: "/#tools",
    subItems: [
      {
        prefix: "Hardhat",
        label: "Runner",
        href: "/hardhat-runner",
        icon: RunnerIcon,
        iconDark: RunnerIconDark,
      },
      {
        prefix: "Hardhat",
        label: "Ignition",
        href: "/ignition",
        icon: IgnitionIcon,
        iconDark: IgnitionIconDark,
      },
      {
        prefix: "Hardhat",
        label: "Network",
        href: "/hardhat-network",
        icon: NetworkIcon,
        iconDark: NetworkIconDark,
      },
      {
        prefix: "Hardhat",
        label: "VSCode",
        href: "/hardhat-vscode",
        icon: SolidityIcon,
        iconDark: SolidityIconDark,
      },
    ],
  },
  {
    label: "Plugins",
    href: "/hardhat-runner/plugins",
  },
  {
    label: "Documentation",
    href: "/docs",
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
  SECTION_URL = "section-url",
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
