import SolidityIcon from "../assets/tools/solidity";
import RunnerIcon from "../assets/tools/runner";
import IgnitionIcon from "../assets/tools/ignition";
import NetworkIcon from "../assets/tools/network";

// TODO-LANDING-DARK: Replace images below with correct dark themed images.

import SolidityImageDesktopDark from "../assets/feature-cards/Desktop/SolidityImageDark.svg";

import SolidityDebuggerImage from "../assets/feature-cards/SolidityDebuggerImage.svg";

import vibrantCommunityImage from "../assets/vibrantCommunityImage.svg";
import vibrantCommunityImageDark from "../assets/vibrantCommunityImageDark.svg";
// import HardhatNews from "../assets/what-is-new/hardhat-news.svg";

import { Tools } from "../components/ui/types";
import reviewsBlock from "../assets/homepage-assets/reviews-block";
import RunnerIconDark from "../assets/tools/runner-dark";
import IgnitionIconDark from "../assets/tools/ignition-dark";
import NetworkIconDark from "../assets/tools/network-dark";
import SolidityIconDark from "../assets/tools/solidity-dark";

import FeatureCardIcons from "../assets/feature-cards/icons";

const whyHardhatContent = {
  title: "Why hardhat?",
  footer: {
    title: "Flexible. Extensible. Fast.",
    text: "Experience the new way of building Ethereum software.",
  },
};

const featureCardsContent = {
  featureCardOne: {
    imageDark: SolidityImageDesktopDark,
    image: SolidityDebuggerImage,
    articleOne: {
      title: "Solidity debugger. Reliable and fully featured.",
      text: "Accelerate your development by diving under the hood. Explore low level EVM aspects to figure out complex bugs quickly.",
      icon: FeatureCardIcons.CCIcon,
      cta: {
        url: "/hardhat-network/#console.log",
        title: "Learn more about the Hardhat Debugger",
      },
    },
    articleTwo: {
      title: "Run Solidity locally on a Rust-powered runtime",
      text: "Deploy your contracts, run tests, and debug your code without dealing with live networks. Hardhat’s Ethereum simulation engine, EDR, is written in Rust for great performance.",
      icon: FeatureCardIcons.CAIcon,
      cta: {
        url: "/hardhat-network/#console.log",
        title: "Learn more about EDR",
      },
    },
  },
  featureCardTwo: {
    imageDark: SolidityImageDesktopDark,
    image: SolidityDebuggerImage,

    articleOne: {
      title: "Comprehensive testing approach",
      text: "Write unit tests in Solidity for speed and conciseness, integration tests in TypeScript for expressiveness and complexity, or fuzzing tests to push the edges. Decide on a case by case basis.",
      icon: FeatureCardIcons.CubIcon,
      cta: {
        url: "/hardhat-network/#console.log",
        title: "Learn more about testing",
      },
    },
    articleTwo: {
      title:
        "Multi-chain ready: Optimism’s OP Stack and Base simulation support",
      text: "Manage multiple networks at the same time and confidently deploy on OP Stack knowing your code was tested on an accurate simulation.",
      icon: FeatureCardIcons.DCDIcon,
      cta: {
        url: "/hardhat-network/#console.log",
        title: "Learn more about simulating Base",
      },
    },
  },
  featureCardThree: {
    imageDark: SolidityImageDesktopDark,
    image: SolidityDebuggerImage,

    articleOne: {
      title: "Simple and reliable deployments",
      text: "Define your contract instances, their operations, and Hardhat Ignition will drive the complex details and parallelize execution.",
      icon: FeatureCardIcons.CDIcon,
      cta: {
        url: "/hardhat-network/#console.log",
        title: "Get started with Hardhat Ignition",
      },
    },
    articleTwo: {
      title: "TypeScript extensibility",
      text: "A tooling platform designed to be extended, Hardhat has all the utilities you need to address your project-specific needs. Change anything you like. Even entire built-in tasks, or just parts of them.",
      icon: FeatureCardIcons.LayoutIcon,
      cta: {
        url: "/hardhat-network/#console.log",
        title: "Learn more about extending Hardhat",
      },
    },
  },
  featureCardFour: {
    imageDark: SolidityImageDesktopDark,
    image: SolidityDebuggerImage,

    articleOne: {
      title: "Plugin ecosystem",
      text: "Extend Hardhat with a composable ecosystem of plugins that add functionality and integrate your existing tools into a smooth workflow.",
      icon: FeatureCardIcons.CCReverseIcon,
      cta: {
        url: "/hardhat-network/#console.log",
        title: "Learn started about simulating Base",
      },
    },
    articleTwo: {
      title: "For teams and projects of any scale",
      text: "From single hacker quickly iterating on a proof of concept to full blown engineering organization dealing with ad-hoc needs at scale, Hardhat adapts as your needs change",
      icon: FeatureCardIcons.CCIcon,
      cta: {
        url: "/hardhat-network/#console.log",
        title: "Get started with plugins",
      },
    },
  },
};

const heroBlockContent = {
  title: "Ethereum development environment for professionals",
  tagline: "<strong>Hardhat 3:</strong> Rearchitected & Rust-powered.",
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

const whatIsNewBlockContent = {
  title: "What’s new in Hardhat",
  news: [
    {
      // imageUrl: HardhatNews,
      imageUrl: vibrantCommunityImage,
      title:
        "Lorem Ipsum dolor sit amet lorem Lorem Ipsum dolor sit amet lorem",
      text: "Accelerate your development by diving under the hood. Explore low level EVM aspects to figure out complex bugs quickly.Explore low level EVM aspects to figure out complex bugs quickly.",
      cta: {
        title: "Learn more about the Hardhat Debugger",
        url: "/hardhat-network/#console.log",
      },
    },
    {
      title: "Lorem Ipsum dolor sit amet lorem Lorem Ipsum dolor sit amet ",
      text: "Accelerate your development by diving under the hood. Explore low level EVM aspects to figure out complex bugs quickly.",
      cta: {
        title: "Learn more about the Hardhat Debugger",
        url: "/hardhat-network/#console.log",
      },
    },
    {
      title: "Lorem Ipsum dolor sit amet lorem Lorem Ipsum dolor sit amet ",
      text: "Accelerate your development by diving under the hood. Explore low level EVM aspects to figure out complex bugs quickly.",
      cta: {
        title: "Learn more about the Hardhat Debugger",
        url: "/hardhat-network/#console.log",
      },
    },
  ],
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

const hardhatNewsContent = {
  title: "Hardhat News",
  cards: [
    {
      image: "https://blog.nomic.foundation/content/images/size/w1000/2024/08/EDR-announcement-blogpost-image.png",
      title: "Hardhat v2.19.0: Introducing Configuration Variables",
      text: "Handling configuration settings is a common situation in Ethereum development, and it often involves sensitive information that could cause…",
      link: "https://blog.nomic.foundation/hardhat-v2-19-0-introducing-configuration-variables-b528c0c9a7c0/"
    },
    {
      image: "https://blog.nomic.foundation/content/images/size/w2000/max/1200/1-tnfkli2xqvyeaqrtxl7dya.png",
      title: "Migrating to Hardhat Ignition from hardhat-deploy",
      text: "Migrating from hardhat-deploy to Hardhat Ignition For several years, the hardhat-deploy",
      link: "https://blog.nomic.foundation/migrating-to-hardhat-ignition-from-hardhat-deploy-c17311bb658f/"
    },
    {
      image: "https://blog.nomic.foundation/content/images/size/w2000/max/800/1-9dqzkhempnzywwkzleayew.png",
      title: "Hardhat + Viem",
      text: "We're happy to announce the newest addition to our official plugins - hardhat-viem. This plugin smoothly integrates the Viem library into…",
      link: "https://blog.nomic.foundation/hardhat-viem-808a536dcfe6/"
    }
  ]
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
  whatIsNewBlockContent,
  hardhatNewsContent,
};

export default homepageContent;
