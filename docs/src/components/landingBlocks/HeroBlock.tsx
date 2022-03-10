import React from "react";
import Section from "../Section";
import CTA from "../ui/CTA";

const content = {
  title: "Ethereum development environment for professionals",
  tagline: "Flexible. Extensible. Fast.",
  cta: {
    title: "Get started",
    // TODO: switch to page reference later
    url: "https://hardhat.org/getting-started/",
  },
  heroImage: {},
};

type Props = {
  content: typeof content;
};

const HeroBlock = ({ content }: Props) => {
  return (
    <Section>
      <h3>{content.title}</h3>
      <CTA href={content.cta.url}>{content.cta.title}</CTA>
    </Section>
  );
};

export default HeroBlock;

HeroBlock.defaultProps = { content };
