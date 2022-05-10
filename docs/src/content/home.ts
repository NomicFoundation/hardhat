import VSCodeIcon from "../assets/tools/vs-code";
import RunnerIcon from "../assets/tools/runner";
import IgnitionIcon from "../assets/tools/ignition";
import NetworkIcon from "../assets/tools/network";
import SolidityImageMobile from "../assets/feature-cards/Mobile/SolidityImage.svg";
import SolidityImageDesktop from "../assets/feature-cards/Desktop/SolidityImage.png";
import FlexibilityImageMobile from "../assets/feature-cards/Mobile/FlexibilityImage.svg";
import FlexibilityImageDesktop from "../assets/feature-cards/Desktop/FlexibilityImage.png";
import ExtensibleImageMobile from "../assets/feature-cards/Mobile/ExtensibleImage.svg";
import ExtensibleImageDesktop from "../assets/feature-cards/Desktop/ExtensibleImage.png";
import FastIterationImageMobile from "../assets/feature-cards/Mobile/FastIterationImage.svg";
import FastIterationImageDesktop from "../assets/feature-cards/Desktop/FastIterationImage.png";
import { Tools } from "../components/ui/types";
import reviewsBlock from "../assets/homepage-assets/reviews-block";

const whyHardhatContent = {
  title: "Why hardhat",
};

const featureCardsContent = {
  featureCardOne: {
    mobileImg: SolidityImageMobile,
    desktopImg: SolidityImageDesktop,
    cta: {
      url: "/hardhat-network/#console-log",
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
    mobileImg: FlexibilityImageMobile,
    desktopImg: FlexibilityImageDesktop,
    cta: {
      url: "/guides/create-task.html",
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
    mobileImg: ExtensibleImageMobile,
    desktopImg: ExtensibleImageDesktop,
    cta: { url: "/plugins", title: "Get started with plugins" },
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
    mobileImg: FastIterationImageMobile,
    desktopImg: FastIterationImageDesktop,
    cta: {
      url: "/guides/typescript.html",
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
    url: "/getting-started",
  },
};

const getStartedBlockContent = {
  title: "Hardhat is next- generation Ethereum tooling",
  subtitle: "Experience the new way of building Ethereum software.",
  cta: {
    title: "Get started",
    url: "/getting-started",
  },
};

const vibrantCommunityBlockContent = {
  title: "Vibrant community",
  text: "Great tech attracts great people. Join the Hardhat community to find answers to your problems and contribute to the plugin ecosystem.",
  imageUrl: "/images/vibrant_community.png",
  cta: {
    title: "Join the Hardhat Discord",
    url: "https://discord.com/invite/TETZs2KK4k",
  },
};

const trustedTeamsBlockContent = {
  title: "Trusted by top teams",
};

const builtByBlockContent = {
  title: "Built by",
  imageUrl: "/images/nomic-foundation-logo.svg",
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
    alt: "Aragone One logo",
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
      title: "Runner",
      value: Tools.RUNNER,
      mottos: ["compile", "test", "extend"],
      description:
        "Task runner that ties compiling, testing and everything else together through a simple and flexible architecture that is extended through a rich plugin ecosystem.",
      link: "/",
    },
    {
      icon: IgnitionIcon,
      title: "Ignition",
      value: Tools.IGNITION,
      mottos: ["deploy", "distribute"],
      description:
        "Deployment system for structuring, automating and distributing smart contract deployment setups.",
      link: "/",
    },
    {
      icon: NetworkIcon,
      title: "Network",
      value: Tools.NETWORK,
      mottos: ["debug", "deploy", "simulate"],
      description:
        "Development network to locally deploy smart contracts. Packed with development features like Solidity console.log, stack traces, different mining modes and more.",
      link: "/",
    },
    {
      icon: VSCodeIcon,
      title: "VS code",
      value: Tools.VS_CODE,
      mottos: ["code", "refactor"],
      description:
        "Visual Studio Code extension for Solidity editing assistance. Code navigation, refactoring and type-smart suggestions.",
      link: "/",
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
