import React from "react";
import { styled } from "linaria/react";
import Image from "next/image";
import Section from "../Section";
import { media, tm, tmDark, tmSelectors } from "../../themes";
import LandingContainer from "../LandingContainer";

import { CTAType } from "../ui/types";
import ArrowRight from "../../assets/icons/arrow-right";
import BracketsImage from "../../assets/why-we/Brackets";

type Props = {
  content: { title: string; news: NewsType[] };
};

export type NewsType = {
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
  font-size: 25px;
  font-weight: 600;
  font-family: SourceCodePro, sans-serif;
  line-height: 1.2;
  letter-spacing: 0.045em;
  margin-bottom: 34px;
  text-align: center;
  color: ${tm(({ colors }) => colors.accent700)};
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.accent800)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.accent800)};
    }
  }
  ${media.tablet} {
    font-size: 31px;
    margin-bottom: 62px;
  }
  ${media.laptop} {
    font-size: 39px;
    text-align: left;
  }
  ${media.desktop} {
    font-size: 49px;
  }
`;

const Brackets = styled.div`
  margin: 0 auto;
  width: max-content;
  &.brackets-top {
    margin-bottom: 30px;
  }
  &.brackets-bottom {
    margin-top: 20px;
    transform: rotate(180deg);
  }
  .lines {
    stroke: #d2d3d5;
    display: block;
  }
  ${tmSelectors.dark} {
    .lines {
      stroke: #333538;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      .lines {
        stroke: #333538;
      }
    }
  }
  ${media.tablet} {
    &.brackets-top {
      margin-bottom: 45px;
    }
    &.brackets-bottom {
      margin-top: 55px;
    }
  }
  ${media.laptop} {
    &.brackets-top {
      margin-bottom: 30px;
    }
  }
`;

const ListNews = styled.div`
  display: grid;
  gap: 32px 24px;
  ${media.tablet} {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, auto);
  }
  ${media.laptop} {
    gap: 32px;
    grid-template-rows: repeat(2, 1fr);
  }
`;

const News = styled.article`
  width: 100%;
  min-width: 100px;
  min-height: 202px;
  display: grid;
  grid-template-rows: auto 1fr;
  &:first-child {
    .news-header {
      padding: 23px;
      border-bottom: none;
      border-color: #6C6F74
      background-color: #FFF100;
      border-right-width: 1px;
      border-right-style: solid;
      gap: 20px;
    }
    .news-title {
      font-weight: 700;
      color: ${tm(({ colors }) => colors.gray9)} !important;
    }
    .news-content {
      padding: 31px 23px;
      border-top: none;
      border-color: #edcf00;
      border-left-width: 1px;
      border-left-style: solid;
      gap: 14px;

    }
  }
  ${tmSelectors.dark} {
    &:first-child {
      .news-header {
        border-color: #FFF
        background-color: #FFF100;
      }

      .news-content {
        border-color: #CCB200;
      }
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      &:first-child {
        .news-header {
          border-color: #FFF
          background-color: #FFF100;
        }

        .news-content {
          border-color: #CCB200;
        }
      }
    }
  }
  ${media.sm} {
    &:first-child {
      .news-header {
        padding: 31px 23px;
        gap: 24px;
      }
      .news-content {
        gap: 14px;
      }
    }
  }
  ${media.tablet} {
    &:first-child {
      grid-column: 1 / 3;
    }
  }
  ${media.laptop} {
    grid-template-columns: 44% 1fr;
    grid-template-rows: auto;
    &:first-child {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr 1fr;
      grid-column: 1 / 2;
      grid-row: 1 / 3;
    }
  }
  ${media.desktop} {
    min-height: 235px;
    &:first-child {
      .news-header {
        padding: 32px 55px;
      }
      .news-content {
        padding: 32px 55px;
      }
    }
  }
`;
const NewsHeader = styled.div`
  width: 100%;
  min-width: 100px;
  background-color: #fffeeb;
  border: 1px solid #edcf00;
  border-bottom: none;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
  ${tmSelectors.dark} {
    background-color: #20232a;
    border-color: #ccb200;
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: #20232a;
      border-color: #ccb200;
    }
  }
  ${media.tablet} {
    min-height: 138px;
  }
  ${media.laptop} {
    border-right: none;
    border-bottom: 1px solid #edcf00;
    min-height: auto;
  }
  ${media.desktop} {
    padding: 24px 32px;
  }
`;
const NewsContent = styled.div`
  width: 100%;
  min-width: 100px;
  background-color: ${tm(({ colors }) => colors.gray1)};
  border: 1px solid #d2d3d5;
  border-top: none;
  padding: 23px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.gray1)};
    border-color: #6c6f74;
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.gray1)};
      border-color: #6c6f74;
    }
  }
  ${media.laptop} {
    gap: 23px;
    justify-content: center;
    border-left: none;
    border-top: 1px solid #d2d3d5;
  }
`;
const NewsImage = styled.div`
  img {
    max-width: 100%;
    max-height: 200px;
    display: block;
  }
`;

const NewsTitle = styled.h3`
  font-family: Roboto, sans-serif;
  font-weight: 400;
  font-size: 18px;
  line-height: 1.5;
  letter-spacing: 0.05em;
  color: ${tm(({ colors }) => colors.gray9)};
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray9)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray9)};
    }
  }
  ${media.tablet} {
    font-size: 20px;
  }
  ${media.desktop} {
    font-size: 25px;
  }
`;

const NewsText = styled.div`
  font-family: Roboto, sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0.045em;
  color: ${tm(({ colors }) => colors.gray7)};
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray7)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray7)};
    }
  }
  ${media.desktop} {
    font-size: 16px;
  }
`;

const NewsLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  font-family: Roboto, sans-serif;
  font-size: 12px;
  font-weight: 600;
  margin-top: auto;
  letter-spacing: 0.02em;
  color: ${tm(({ colors }) => colors.gray8b)};
  .icon {
    color: #edcf00;
    fill: currentColor;
    width: 12px;
    height: 12px;
  }
  &:hover {
    color: #ccb200 !important;
    .icon {
      color: #040405;
    }
  }

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray8b)};
    &:hover {
      .icon {
        color: #fff;
      }
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray8b)};
      &:hover {
        .icon {
          color: #fff;
        }
      }
    }
  }

  ${media.laptop} {
    margin-top: 0;
    font-size: 14px;
    .icon {
      width: 16px;
      height: 16px;
    }
  }
  ${media.desktop} {
    font-size: 16px;
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
            <BracketsImage />
          </Brackets>
          <Title>{content.title}</Title>
          <ListNews>
            {content?.news.map((item: NewsType) => (
              <NewsCard key={item.title} {...item} />
            ))}
          </ListNews>
          <Brackets className="brackets-bottom">
            <BracketsImage />
          </Brackets>
        </LandingContainer>
      </Container>
    </Section>
  );
};

export default WhatIsNewBlock;
