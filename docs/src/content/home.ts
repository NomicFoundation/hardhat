import SolidityIcon from "../assets/tools/solidity";
import RunnerIcon from "../assets/tools/runner";
import IgnitionIcon from "../assets/tools/ignition";
import NetworkIcon from "../assets/tools/network";

import SolidityImageMobile from "../assets/feature-cards/Mobile/SolidityImage.svg";
import SolidityImageDesktop from "../assets/feature-cards/Desktop/SolidityImage.svg";
import FlexibilityImageMobile from "../assets/feature-cards/Mobile/FlexibilityImage.svg";
import FlexibilityImageDesktop from "../assets/feature-cards/Desktop/FlexibilityImage.svg";
import ExtensibleImageMobile from "../assets/feature-cards/Mobile/ExtensibleImage.svg";
import ExtensibleImageDesktop from "../assets/feature-cards/Desktop/ExtensibleImage.svg";
import FastIterationImageMobile from "../assets/feature-cards/Mobile/FastIterationImage.svg";
import FastIterationImageDesktop from "../assets/feature-cards/Desktop/FastIterationImage.svg";

// TODO-LANDING-DARK: Replace images below with correct dark themed images.
import SolidityImageMobileDark from "../assets/feature-cards/Mobile/SolidityImageDark.svg";
import SolidityImageDesktopDark from "../assets/feature-cards/Desktop/SolidityImageDark.svg";
import FlexibilityImageMobileDark from "../assets/feature-cards/Mobile/FlexibilityImageDark.svg";
import FlexibilityImageDesktopDark from "../assets/feature-cards/Desktop/FlexibilityImageDark.svg";
import ExtensibleImageMobileDark from "../assets/feature-cards/Mobile/ExtensibleImageDark.svg";
import ExtensibleImageDesktopDark from "../assets/feature-cards/Desktop/ExtensibleImageDark.svg";
import FastIterationImageMobileDark from "../assets/feature-cards/Mobile/FastIterationImageDark.svg";
import FastIterationImageDesktopDark from "../assets/feature-cards/Desktop/FastIterationImageDark.svg";

import vibrantCommunityImage from "../assets/vibrantCommunityImage.svg";
import vibrantCommunityImageDark from "../assets/vibrantCommunityImageDark.svg";

import { Tools } from "../components/ui/types";
import reviewsBlock from "../assets/homepage-assets/reviews-block";
import RunnerIconDark from "../assets/tools/runner-dark";
import IgnitionIconDark from "../assets/tools/ignition-dark";
import NetworkIconDark from "../assets/tools/network-dark";
import SolidityIconDark from "../assets/tools/solidity-dark";

const whyHardhatContent = {
  title: "Why hardhat",
};

const featureCardsContent = {
  featureCardOne: {
    mobileImgDark: SolidityImageMobileDark,
    desktopImgDark: SolidityImageDesktopDark,
    mobileImg: SolidityImageMobile,
    desktopImg: SolidityImageDesktop,
    cta: {
      url: "/hardhat-network/#console.log",
      title: "Get started with Solidity console.log",
    },
    articleOne: {
      title: "Run Solidity locally",
      text: "Easily deploy your contracts, run tests and debug Solidity code without dealing with live environments. Hardhat Network is a local Ethereum network designed for development.",
    },
    articleTwo: {
      title: "Debugging-first ",
      text: "Hardhat is the best choice for Solidity debugging. You get Solidity stack traces, console.log and explicit error messages when transactions fail.",
    },
  },
  featureCardTwo: {
    mobileImgDark: FlexibilityImageMobileDark,
    desktopImgDark: FlexibilityImageDesktopDark,
    mobileImg: FlexibilityImageMobile,
    desktopImg: FlexibilityImageDesktop,
    cta: {
      url: "/hardhat-runner/docs/advanced/create-task.html",
      title: "Learn more about extending Hardhat",
    },
    articleOne: {
      title: "Extreme flexibility",
      text: "Change anything you like. Even entire out-of-the-box tasks, or just parts of them. Flexible and customizable design, with little constraints.",
    },
    articleTwo: {
      title: "Bring your own tools",
      text: "Designed to make integrations easy, Hardhat allows you to keep using your existing tools while enabling deeper interoperability between them.",
    },
  },
  featureCardThree: {
    mobileImgDark: ExtensibleImageMobileDark,
    desktopImgDark: ExtensibleImageDesktopDark,
    mobileImg: ExtensibleImageMobile,
    desktopImg: ExtensibleImageDesktop,
    cta: { url: "/hardhat-runner/plugins", title: "Get started with plugins" },
    articleOne: {
      title: "Fully extensible",
      text: "A tooling platform designed to be extended, Hardhat has all the utilities you need to address your project-specific needs.",
    },
    articleTwo: {
      title: "Plugin ecosystem",
      text: "Extend Hardhat with a composable ecosystem of plugins that add functionality and integrate your existing tools into a smooth workflow.",
    },
  },
  featureCardFour: {
    mobileImgDark: FastIterationImageMobileDark,
    desktopImgDark: FastIterationImageDesktopDark,
    mobileImg: FastIterationImageMobile,
    desktopImg: FastIterationImageDesktop,
    cta: {
      url: "/hardhat-runner/docs/guides/typescript.html",
      title: "Get started with TypeScript",
    },
    articleOne: {
      title: "Fast iteration",
      text: "Keep your momentum going by making your development feedback loop up to 10x faster with Hardhat.",
    },
    articleTwo: {
      title: "TypeScript",
      text: "Catch mistakes before you even run your code by switching to a typed language. Hardhat provides full native support for TypeScript.",
    },
  },
};

const heroBlockContent = {
  title: "Ethereum development environment for professionals",
  tagline: "Flexible. Extensible. Fast.",
  cta: {
    title: "Get started",
    url: "/hardhat-runner/docs/getting-started",
  },
};

const getStartedBlockContent = {
  title: "Hardhat is next- generation Ethereum tooling",
  subtitle: "Experience the new way of building Ethereum software.",
  cta: {
    title: "Get started",
    url: "/hardhat-runner/docs/getting-started",
  },
};

const vibrantCommunityBlockContent = {
  title: "Vibrant community",
  text: "Great tech attracts great people. Join the Hardhat community to find answers to your problems and contribute to the plugin ecosystem.",
  // imageUrl: "/images/vibrant_community.png",
  imageUrl: vibrantCommunityImage,
  // TODO-LANDING-DARK: add missing image vibrant_community-dark.png
  imageDarkUrl: vibrantCommunityImageDark,
  cta: {
    title: "Join the Hardhat Discord",
    url: "/discord",
  },
};

const trustedTeamsBlockContent = {
  title: "Trusted by top teams",
};

const builtByBlockContent = {
  title: "Built by",
  imageUrl: "/images/nomic-foundation-logo.svg",
  imageDarkUrl: "/images/nomic-foundation-logo-dark.svg",
};

const reviewsBlockContent = [
  {
    name: "Victor Tran",
    position: "CTO  at  Kyber",
    personImage: reviewsBlock.victor,
    companyImage: "/images/reveiws-logo/kyber.svg",
    alt: "Kyber logo",
    comment:
      '"Working with Hardhat has been a great experience. Thanks to its flexibility we were able to test across different Solidity versions without duplicating our setup. Kyber has been around for long enough to have legacy contracts deployed with different Solidity versions in our architecture, so this kind of flexibility is important for such a mature project. The collaboration between the Kyber and Hardhat teams to fix issues and implement new features has been fast and smooth, which helped our internal timelines a lot."',
  },
  {
    name: "Justin J. Moses",
    position: "CTO  at  SYNTHETIX",
    personImage: reviewsBlock.justin,
    companyImage: "/images/reveiws-logo/synthetix.svg",
    alt: "Synthetix logo",
    comment:
      '"Tired of battling other testing frameworks, I tried Hardhat on a whim one afternoon to see just how hard it might be to port Synthetix over to it. After fifteen minutes I had one of our specs running nearly 10x faster that what I’d become used to; from that moment I was hooked. Since then, we’ve integrated coverage, supported multiple versions of solc and even set up legacy testing through injection - all without having to wait for features to be added by the Hardhat team. It’s been built using its own extensible task system, dogfooding its own plugin architecture. Fast test turnarounds, extensible architecture and solidity stack traces - my dream of smart contract TDD has become a lot more real!"',
  },
  {
    name: "Brett Sun",
    position: "CTO  at  Aragon One",
    personImage: reviewsBlock.brett,
    companyImage: "/images/reveiws-logo/aone.svg",
    alt: "Aragon One logo",
    comment:
      '"Our interest in Hardhat was driven by our own experience of building and maintaining developer tooling for the Aragon ecosystem. Not only were these efforts time consuming, difficult, and error-prone, we also found ourselves constantly re-inventing the wheel in areas we did not want to care about or force opinions on (e.g. Ganache connections, Truffle providers, test strategy). Hardhat, with its plugin ecosystem, has effectively eliminated many of these problems for us. We feel confident piggybacking on the best for the underlying layers so that we can focus our attention on exposing the power of the Aragon ecosystem to our community."',
  },
  {
    name: "Rahul Sethuram",
    position: "CTO  at  Connext Network",
    personImage: reviewsBlock.rahul,
    companyImage: "/images/reveiws-logo/connext.svg",
    alt: "Connext logo",
    comment:
      "\"Builder has become an essential part of our development and Continuous Integration stack. At Connext, we develop and test complicated smart contract systems for our state channel implementations, making proper Solidity tooling a key to our productivity and success. Hardhat's state-of-the-art Solidity stack trace and console.log features saved us considerable development time. As a user, it's clear that Hardhat prioritizes a great developer experience, which aligns fully with Connext's values. We enjoy interacting with the team and we have even made contributions to the project.\"",
  },
  {
    name: "Esteban Ordano",
    position: "CTO  at  Decentraland",
    personImage: reviewsBlock.esteban,
    companyImage: "/images/reveiws-logo/decentraland.svg",
    alt: "Decentraland logo",
    comment:
      '"Hardhat\'s extensibility, clean interface and excellent design is the most significant advancement in the professionalization of tools for Ethereum of the past year. Our development experience improved significantly, and the quality of the development process is reflected in the fact that our team went from fearing updating packages to the latest version to watching out for the next release."',
  },
];

const toolsBlockContent = {
  title: "Tools",
  companyName: "Hardhat",
  infoItems: [
    {
      icon: RunnerIcon,
      iconDark: RunnerIconDark,
      title: "Runner",
      value: Tools.RUNNER,
      mottos: ["compile", "test", "extend"],
      description:
        "Hardhat Runner is the main component you interact with when using Hardhat. It's a flexible and extensible task runner that helps you manage and automate the recurring tasks inherent to developing smart contracts and dApps.",
      link: "/hardhat-runner",
    },
    {
      icon: IgnitionIcon,
      iconDark: IgnitionIconDark,
      title: "Ignition",
      value: Tools.IGNITION,
      mottos: ["deploy"],
      description:
        "Declarative deployment system that enables you to deploy your smart contracts without navigating the mechanics of the deployment process.",
      link: "/ignition",
    },
    {
      icon: NetworkIcon,
      iconDark: NetworkIconDark,
      title: "Network",
      value: Tools.NETWORK,
      mottos: ["debug", "deploy", "simulate"],
      description:
        "Hardhat comes built-in with Hardhat Network, a local Ethereum network node designed for development. It allows you to deploy your contracts, run your tests and debug your code, all within the confines of your local machine.",
      link: "/hardhat-network",
    },
    {
      icon: SolidityIcon,
      iconDark: SolidityIconDark,
      title: "VSCode",
      value: Tools.SOLIDITY,
      mottos: ["code", "navigation", "refactor"],
      description:
        "Hardhat for Visual Studio Code is a VS Code extension that adds language support for Solidity and provides editor integration for Hardhat projects.",
      link: "/hardhat-vscode",
    },
  ],
};

const homepageContent = {
  whyHardhatContent,
  featureCardsContent,
  heroBlockContent,
  getStartedBlockContent,
  vibrantCommunityBlockContent,
  trustedTeamsBlockContent,
  builtByBlockContent,
  reviewsBlockContent,
  toolsBlockContent,
};

export default homepageContent;
