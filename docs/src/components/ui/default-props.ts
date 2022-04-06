import GitHubLogo from "../../assets/socials/gh-logo";
import TwitterLogo from "../../assets/socials/tw-logo";
import DiscordLogo from "../../assets/socials/dc-logo";
import VictorImage from "../../assets/images/victor.png";
import KyberImage from "../../assets/images/trustedTeamsLogos/kyber.png";
import JustimImage from "../../assets/images/justin.jpg";
import SynthetixImage from "../../assets/images/trustedTeamsLogos/synthetix.png";
import BrettImage from "../../assets/images/brett.jpg";
import AragoneOneImage from "../../assets/images/trustedTeamsLogos/aragonOne.png";
import RahulImage from "../../assets/images/rahul.png";
import ConnextImage from "../../assets/images/trustedTeamsLogos/connext.png";
import EstebanImage from "../../assets/images/esteban.png";
import DecentralandImage from "../../assets/images/trustedTeamsLogos/decentraland.png";

import { BANNER_LINK, SOCIALS_LINKS } from "../../config";
import { SocialsEnum } from "./types";

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

const defaultCTAContent = {
  title: "Hardhat is next- generation Ethereum tooling",
  subtitle: "Experience the new way of building Ethereum software.",
  cta: {
    title: "Get started",
    url: "/getting-started",
  },
};

const defaultVibrantCommunityBlockContent = {
  title: "Vibrant community",
  text: "Great tech attracts great people. Join the Hardhat community to find answers to your problems and contribute to the plugin ecosystem.",
  cta: {
    title: "Join the Hardhat Discord",
    // TODO: switch to page reference later
    url: "https://hardhat.org/getting-started/",
  },
};

const defaultTrustedTeamsBlockContent = {
  title: "Trusted by top teams",
};

const defaultBuiltByBlockContent = {
  title: "Built by",
};

const defaultReviewsBlockContent = [
  {
    name: "Victor Tran",
    position: "CTO  at  Kyber",
    personImage: VictorImage,
    companyImage: KyberImage,
    alt: "Kyber logo",
    comment:
      '"Working with Hardhat has been a great experience. Thanks to its flexibility we were able to test across different Solidity versions without duplicating our setup. Kyber has been around for long enough to have legacy contracts deployed with different Solidity versions in our architecture, so this kind of flexibility is important for such a mature project. The collaboration between the Kyber and Hardhat teams to fix issues and implement new features has been fast and smooth, which helped our internal timelines a lot."',
  },
  {
    name: "Justin J. Moses",
    position: "CTO  at  SYNTHETIX",
    personImage: JustimImage,
    companyImage: SynthetixImage,
    alt: "Synthetix logo",
    comment:
      '"Tired of battling other testing frameworks, I tried Hardhat on a whim one afternoon to see just how hard it might be to port Synthetix over to it. After fifteen minutes I had one of our specs running nearly 10x faster that what I’d become used to; from that moment I was hooked. Since then, we’ve integrated coverage, supported multiple versions of solc and even set up legacy testing through injection - all without having to wait for features to be added by the Hardhat team. It’s been built using its own extensible task system, dogfooding its own plugin architecture. Fast test turnarounds, extensible architecture and solidity stack traces - my dream of smart contract TDD has become a lot more real!"',
  },
  {
    name: "Brett Sun",
    position: "CTO  at  Aragon One",
    personImage: BrettImage,
    companyImage: AragoneOneImage,
    alt: "Aragone One logo",
    comment:
      '"Our interest in Hardhat was driven by our own experience of building and maintaining developer tooling for the Aragon ecosystem. Not only were these efforts time consuming, difficult, and error-prone, we also found ourselves constantly re-inventing the wheel in areas we did not want to care about or force opinions on (e.g. Ganache connections, Truffle providers, test strategy). Hardhat, with its plugin ecosystem, has effectively eliminated many of these problems for us. We feel confident piggybacking on the best for the underlying layers so that we can focus our attention on exposing the power of the Aragon ecosystem to our community."',
  },
  {
    name: "Rahul Sethuram",
    position: "CTO  at  Connext Network",
    personImage: RahulImage,
    companyImage: ConnextImage,
    alt: "Connext logo",
    comment:
      "\"Builder has become an essential part of our development and Continuous Integration stack. At Connext, we develop and test complicated smart contract systems for our state channel implementations, making proper Solidity tooling a key to our productivity and success. Hardhat's state-of-the-art Solidity stack trace and console.log features saved us considerable development time. As a user, it's clear that Hardhat prioritizes a great developer experience, which aligns fully with Connext's values. We enjoy interacting with the team and we have even made contributions to the project.\"",
  },
  {
    name: "Esteban Ordano",
    position: "CTO  at  Decentraland",
    personImage: EstebanImage,
    companyImage: DecentralandImage,
    alt: "Decentraland logo",
    comment:
      '"Hardhat\'s extensibility, clean interface and excellent design is the most significant advancement in the professionalization of tools for Ethereum of the past year. Our development experience improved significantly, and the quality of the development process is reflected in the fact that our team went from fearing updating packages to the latest version to watching out for the next release."',
  },
];

const defaultProps = {
  defaultSocialsItems,
  defaultBannerContent,
  defaultHeroBlockContent,
  defaultCTAContent,
  defaultVibrantCommunityBlockContent,
  defaultTrustedTeamsBlockContent,
  defaultBuiltByBlockContent,
  defaultReviewsBlockContent,
};

export default defaultProps;
