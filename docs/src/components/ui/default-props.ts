import { SocialsEnum } from "./types";
import GitHubLogo from "../../assets/socials/gh-logo";
import TwitterLogo from "../../assets/socials/tw-logo";
import DiscordLogo from "../../assets/socials/dc-logo";
import { BANNER_LINK, SOCIALS_LINKS } from "../../config";

const defaultSocialsItems = [
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

const defaultBannerContent = {
  text: "Join the Hardhat team! Nomic Labs is hiring",
  href: BANNER_LINK,
};

const defaultHeroBlockContent = {
  title: "Ethereum development environment for professionals",
  tagline: "Flexible. Extensible. Fast.",
  cta: {
    title: "Get started",
    url: "/getting-started",
  },
};

const defaultProps = {
  defaultSocialsItems,
  defaultBannerContent,
  defaultHeroBlockContent,
};

export default defaultProps;
