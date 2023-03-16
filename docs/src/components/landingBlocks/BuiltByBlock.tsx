import React from "react";
import { styled } from "linaria/react";
import Image from "next/image";

import Section from "../Section";
import { media, tm, tmDark, tmSelectors } from "../../themes";

interface Props {
  content: { title: string; imageUrl: string; imageDarkUrl: string };
}

const Container = styled.div`
  margin-bottom: 234px;
  text-align: center;

  ${media.md} {
    margin-bottom: 195px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  & .dark {
    display: none;
  }
  ${tmSelectors.dark} {
    & .light {
      display: none;
    }
    & .dark {
      display: inline;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      & .light {
        display: none;
      }
      & .dark {
        display: inline;
      }
    }
  }
`;

const Title = styled.h2`
  margin-bottom: 16px;
  font-size: 18px;
  line-height: 40px;
  font-weight: 400;
  font-family: ChivoLight, sans-serif;
  color: ${tm(({ colors }) => colors.neutral900)};
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }

  ${media.md} {
    margin-right: 22px;
    margin-top: 10px;
    font-size: 24px;
  }
`;

const BuiltByBlock = ({ content }: Props) => {
  return (
    <Section>
      <Container>
        <Title>{content.title}</Title>
        <span className="light">
          <Image
            src={content.imageUrl}
            width={194}
            height={51}
            alt="Nomic Foundation logo"
          />
        </span>
        <span className="dark">
          <Image
            src={content.imageDarkUrl}
            width={194}
            height={51}
            alt="Nomic Foundation logo"
          />
        </span>
      </Container>
    </Section>
  );
};

export default BuiltByBlock;
