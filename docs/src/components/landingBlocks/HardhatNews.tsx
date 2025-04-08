import React from "react";
import { styled } from "linaria/react";
import Section from "../Section";
import { media, tm, tmDark, tmSelectors } from "../../themes";
import LandingContainer from "../LandingContainer";

export type NewsCardProps = {
  image: string;
  title: string;
  text: string;
  link?: string;
};

type Props = React.PropsWithChildren<{
  content: {
    title: string;
    cards: NewsCardProps[];
  };
}>;

const Container = styled.div`
  width: 100%;
  position: relative;
  padding: 80px 0 50px;
  background-color: ${tm(({ colors }) => colors.neutral0)};

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral0)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.neutral0)};
    }
  }
  ${media.tablet} {
    padding: 84px 0 50px;
  }
`;

const Title = styled.h2`
  font-size: 25px;
  font-weight: 600;
  font-family: SourceCodePro, monospace;
  line-height: 1.3;
  letter-spacing: 0.04em;
  margin-bottom: 42px;
  text-transform: none;
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
    margin-bottom: 56px;
  }
  ${media.laptop} {
    font-size: 39px;
    text-align: left;
  }
  ${media.desktop} {
    font-size: 49px;
  }
`;

const CardsContainer = styled.div`
  display: grid;
  gap: 24px;
  ${media.laptop} {
    grid-template-columns: repeat(3, 1fr);
  }
  ${media.desktop} {
    gap: 32px;
  }
`;

const Card = styled.article`
  padding: 24px;
  background-color: ${tm(({ colors }) => colors.gray1)};
  border: 1px solid;
  border-color: ${tm(({ colors }) => colors.gray2)};
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  transition: border-color 0.2s ease-in-out, background-color 0.2s ease-in-out;

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.gray1)};
    border-color: ${tmDark(({ colors }) => colors.gray3)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.gray1)};
      border-color: ${tmDark(({ colors }) => colors.gray3)};
    }
  }
  &:has(a):hover {
    border-color: ${tm(({ colors }) => colors.accent800)};
    background-color: #fffeeb;
    ${tmSelectors.dark} {
      border-color: ${tmDark(({ colors }) => colors.accent700)};
      background-color: ${tmDark(({ colors }) => colors.accent200)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        border-color: ${tmDark(({ colors }) => colors.accent700)};
        background-color: ${tmDark(({ colors }) => colors.accent200)};
      }
    }
  }
  ${media.tablet} {
    flex-direction: row;
    align-items: flex-start;
  }
  ${media.laptop} {
    padding: 32px;
    gap: 34px;
    flex-direction: column;
    justify-content: flex-start;
  }
  ${media.desktop} {
    padding: 40px;
    gap: 40px;
  }
`;

const ImageContainer = styled.div`
  height: 174px;
  background-color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  flex: none;
  overflow: hidden;
  position: relative;

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral600)};
  }
  ${media.tablet} {
    width: 304px;
  }
  ${media.laptop} {
    height: 166px;
    width: 100%;
  }
  ${media.desktop} {
    height: 206px;
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  padding-top: 8px;
  ${media.laptop} {
    gap: 16px;
    padding-top: 0;
  }
`;

const CardTitle = styled.h3`
  color: ${tm(({ colors }) => colors.gray9)};
  font-size: 20px;
  font-weight: 700;
  font-family: Roboto, sans-serif;
  line-height: 1.3;
  letter-spacing: 0.05em;
  width: 100%;

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray7)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray7)};
    }
  }
  ${media.desktop} {
    font-size: 25px;
  }
`;

const CardText = styled.p`
  color: ${tm(({ colors }) => colors.gray7)};
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  font-family: Roboto, sans-serif;
  letter-spacing: 0.05em;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;

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

const CardLink = styled.a`
  text-decoration: none;
  color: inherit;
  display: block;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
`;

const Line = styled.div`
  max-width: none;
  width: 680px;
  height: 40px;
  border-color: ${tm(({ colors }) => colors.gray3)};
  border-style: solid;
  border-width: 0 1px 1px 1px;
  margin-top: -5px;
  margin-left: auto;
  margin-right: auto;
  pointer-events: none;
  ${tmSelectors.dark} {
    border-color: ${tmDark(({ colors }) => colors.gray3)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      border-color: ${tmDark(({ colors }) => colors.gray3)};
    }
  }
  ${media.tablet} {
    margin-top: 32px;
  }
  ${media.laptop} {
    width: auto;
    max-width: 1128px;
  }
  ${media.desktop} {
    max-width: 1408px;
  }
`;

const NewsCard: React.FC<NewsCardProps> = ({ image, title, text, link }) => {
  return (
    <Card>
      {link && <CardLink href={link} />}
      <ImageContainer>
        <CardImage src={image} alt={title} />
      </ImageContainer>
      <TextContainer>
        <CardTitle>{title}</CardTitle>
        <CardText>{text}</CardText>
      </TextContainer>
    </Card>
  );
};

const HardhatNews = ({ content }: Props) => {
  return (
    <Section clearPadding>
      <Container>
        <LandingContainer>
          <Title>{content.title}</Title>
          <CardsContainer>
            {content.cards.map((card) => (
              <NewsCard
                key={card.link}
                image={card.image}
                title={card.title}
                text={card.text}
                link={card.link}
              />
            ))}
          </CardsContainer>
        </LandingContainer>
        <Line />
      </Container>
    </Section>
  );
};

export default HardhatNews;
