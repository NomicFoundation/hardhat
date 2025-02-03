import { DiscordLogo } from "./dc-logo";
import { GitHubLogo } from "./gh-logo";
import { TwitterLogo } from "./tw-logo";

export enum SocialsEnum {
  GITHUB = "GITHUB",
  TWITTER = "TWITTER",
  DISCORD = "DISCORD",
}

const SOCIALS_LINKS = {
  [SocialsEnum.GITHUB]: "https://hardhat.org/ignition",
  [SocialsEnum.TWITTER]: "https://twitter.com/HardhatHQ",
  [SocialsEnum.DISCORD]: "https://hardhat.org/ignition-discord",
};

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
