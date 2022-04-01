import React from "react";
import { styled } from "linaria/react";
import Image from "next/image";
import NomicFoundationLogo from "../../assets/images/nomic-foundation-logo.png";

import Section from "../Section";
import { appTheme } from "../../themes";
import defaultProps from "../ui/default-props";

interface Props {
  content: typeof defaultProps.defaultBuiltByBlockContent;
}

const { media } = appTheme;

const Container = styled.div`
  margin-bottom: 234px;
  text-align: center;

  ${media.lg} {
    margin-bottom: 195px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
`;

const Title = styled.h2`
  margin-bottom: 16px;
  font-size: 18px;
  line-height: 40px;
  font-weight: 400;
  font-family: ChivoLight, sans-serif;

  ${media.lg} {
    margin-right: 12px;
    margin-top: 10px;
    font-size: 24px;
  }
`;

const BuiltByBlock = ({ content }: Props) => {
  return (
    <Section>
      <Container>
        <Title>{content.title}</Title>
        <Image
          src={NomicFoundationLogo}
          alt="Nomic Foundation logo"
          quality={100}
        />
      </Container>
    </Section>
  );
};

export default BuiltByBlock;
