import React from "react";
import HardhatNews from "./HardhatNews";

export default {
  title: "Landing Blocks/Hardhat News",
};

const mockContent = {
  title: "Latest Hardhat News",
  cards: [
    {
      image: "/images/hardhat-tutorial.svg",
      title: "Hardhat 3.0 Released",
      text: "We're excited to announce the release of Hardhat 3.0, featuring a Rust-powered Ethereum simulation engine, improved performance, and new developer tools.",
      link: "/blog/hardhat-3-release"
    },
    {
      image: "/images/hardhat-tutorial.svg",
      title: "New VSCode Extension Features",
      text: "Our VSCode extension now supports advanced Solidity refactoring capabilities, improved hover information, and better integration with Hardhat projects.",
      link: "/blog/vscode-extension-update"
    },
    {
      image: "/images/hardhat-tutorial.svg",
      title: "Hardhat Ignition: Simplifying Deployments",
      text: "Learn how Hardhat Ignition can help you simplify complex contract deployments with our declarative, deterministic deployment system.",
      link: "/blog/ignition-simplifying-deployments"
    }
  ]
};

export const Default = () => (
  <HardhatNews content={mockContent} />
);