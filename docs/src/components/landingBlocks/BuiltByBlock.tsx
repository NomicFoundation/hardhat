import React from "react";
import { styled } from "linaria/react";
import Image from "next/image";

import Section from "../Section";
import { media } from "../../themes";

interface Props {
  content: { title: string; imageUrl: string };
}

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
          src={content.imageUrl}
          width={194}
          height={51}
          alt="Nomic Foundation logo"
        />
      </Container>
    </Section>
  );
};

export default BuiltByBlock;
