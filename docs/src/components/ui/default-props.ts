import { MenuItemType, SocialsEnum } from "./types";
import GitHubLogo from "../../assets/socials/gh-logo";
import TwitterLogo from "../../assets/socials/tw-logo";
import DiscordLogo from "../../assets/socials/dc-logo";

export const defaultSocialsItems = [
  {
    name: SocialsEnum.GIT_HUB,
    href: "https://github.com/NomicFoundation/hardhat",
    Icon: GitHubLogo,
  },
  {
    name: SocialsEnum.TWITTER,
    href: "https://twitter.com/HardhatHQ",
    Icon: TwitterLogo,
  },
  {
    name: SocialsEnum.DISCORD,
    href: "https://discord.com/invite/TETZs2KK4k",
    Icon: DiscordLogo,
  },
];
