import React from "react";
import { styled } from "linaria/react";
import Image from "next/image";
import Section from "../Section";
import { media, tm, tmDark, tmSelectors } from "../../themes";
import LandingContainer from "../LandingContainer";

import brackets from "../../assets/why-we/Brackets.svg";
import { CTAType } from "../ui/types";
import ArrowRight from "../../assets/icons/arrow-right";

type Props = React.PropsWithChildren<{
  content: { title: string; news: NewsType[] };
}>;

type NewsType = {
  imageUrl?: string;
  title: string;
  text: string;
  cta: CTAType;
};

const Container = styled.div`
  width: 100%;
  position: relative;
`;

const Title = styled.h2`
  color: #ccb200;
  text-transform: capitalize;
  font-size: 49px;
  font-weight: 600;
  font-family: SourceCodePro, sans-serif;
  line-height: 1.2;
  letter-spacing: 0.045em;
  margin-bottom: 62px;

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
`;

const Brackets = styled.div`
  margin: 0 auto;
  width: max-content;
  &.brackets-top {
    margin-bottom: 35px;
  }
  &.brackets-bottom {
    margin-top: 35px;
    transform: rotate(180deg);
  }
  img {
    margin: 0 auto;
  }
`;

const ListNews = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 32px;
`;

const News = styled.article`
  width: 100%;
  min-width: 100px;
  min-height: 235px;
  display: grid;
  grid-template-columns: 44% 1fr;

  &:first-child {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    grid-column: 1 / 2;
    grid-row: 1 / 3;
    .news-header {
      padding: 50px 55px;
      border-bottom: none;
      border-color: #6C6F74
      background-color: #FFF100;
      border-right-width: 1px;
      border-right-style: solid;

    }
    .news-title {
      font-weight: 700;
    }
    .news-content {
      padding: 50px 55px;
      border-top: none;
      border-color: #edcf00;
      border-left-width: 1px;
      border-left-style: solid;
    }
  }
`;
const NewsHeader = styled.div`
  width: 100%;
  min-width: 100px;
  background-color: #fffeeb;
  border: 1px solid #edcf00;
  border-right: none;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
`;
const NewsContent = styled.div`
  width: 100%;
  min-width: 100px;
  background-color: #fbfbfb;
  border: 1px solid #b0b2b5;
  border-left: none;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;
const NewsImage = styled.div`
  img {
    max-width: 100%;
    display: block;
  }
`;

const NewsTitle = styled.h3`
  font-family: Roboto, sans-serif;
  font-weight: 400;
  font-size: 25px;
  line-height: 1.3;
  letter-spacing: 0.05em;
  color: #181a1f;
`;

const NewsText = styled.div`
  font-family: Roboto, sans-serif;
  font-size: 16px;
  font-weight: 400;
  color: #4a4d54;
  line-height: 1.5;
  letter-spacing: 0.045em;
`;

const NewsLink = styled.a`
  margin-top: 23px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #181a1f;
  font-family: Roboto, sans-serif;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
  .icon {
    color: #edcf00;

    fill: currentColor;
    width: 16px;
    height: 16px;
  }
  &:hover {
    color: #ccb200;
    .icon {
      color: #040405;
    }
  }
`;
const NewsCard = ({ title, text, cta, imageUrl }: NewsType) => {
  return (
    <News>
      <NewsHeader className="news-header">
        {imageUrl && (
          <NewsImage>
            <Image src={imageUrl} alt={title} />
          </NewsImage>
        )}
        <NewsTitle className="news-title">{title}</NewsTitle>
      </NewsHeader>
      <NewsContent className="news-content">
        <NewsText>{text}</NewsText>
        <NewsLink href={cta.url}>
          {cta.title}
          <ArrowRight />
        </NewsLink>
      </NewsContent>
    </News>
  );
};

const WhatIsNewBlock = ({ content }: Props) => {
  return (
    <Section clearPadding>
      <Container>
        <LandingContainer>
          <Brackets className="brackets-top">
            <Image src={brackets} alt="lines" width={101} height={98} />
          </Brackets>
          <Title>{content.title}</Title>
          <ListNews>
            {content.news.map((item) => (
              <NewsCard key={item.title} {...item} />
            ))}
          </ListNews>
          <Brackets className="brackets-bottom">
            <Image src={brackets} alt="lines" width={101} height={98} />
          </Brackets>
        </LandingContainer>
      </Container>
    </Section>
  );
};

export default WhatIsNewBlock;
