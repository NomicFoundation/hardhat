import React from "react";
import { styled } from "linaria/react";

import Section from "../Section";
import { appTheme } from "../../themes";

interface Props {
  content: { title: string; imageUrl: string };
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
        {/* eslint-disable-next-line */}
        <img src={content.imageUrl} alt="Nomic Foundation logo" />
      </Container>
    </Section>
  );
};

export default BuiltByBlock;
