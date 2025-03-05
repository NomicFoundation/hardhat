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

const Wrapper = styled.div`
  width: 100%;
  position: relative;
  padding: 84px 0 128px;

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral800)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.neutral800)};
    }
  }
`;

const Title = styled.h2`
  color: #ccb200;
  font-size: 49px;
  font-weight: 600;
  font-family: SourceCodePro, monospace;
  line-height: 58.8px;
  letter-spacing: 0.2em;
  margin-bottom: 40px;

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral100)};
  }
`;

const CardsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  justify-content: flex-start;

  ${media.sm} {
    justify-content: center;
  }

  ${media.md} {
    justify-content: flex-start;
  }
`;

const Card = styled.article`
  width: 100%;
  height: 494px;
  padding: 40px;
  background-color: #fbfbfb;
  border: 1px solid #e5e6e7;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 40px;

  ${media.md} {
    width: 448px;
  }

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral700)};
    border-color: ${tmDark(({ colors }) => colors.neutral600)};
  }
`;

const CardContent = styled.div`
  height: 414px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 40px;
  width: 100%;
`;

const ImageContainer = styled.div`
  height: 206px;
  background-color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  overflow: hidden;
  position: relative;

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral600)};
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const TextContainer = styled.div`
  height: 168px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 16px;
  width: 100%;
`;

const CardTitle = styled.h3`
  color: #16181d;
  font-size: 25px;
  font-weight: 700;
  font-family: Roboto, sans-serif;
  line-height: 1.5;
  letter-spacing: 0.05em;
  width: 100%;

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral100)};
  }
`;

const CardText = styled.p`
  color: #4a4d54;
  font-size: 16px;
  font-weight: 400;
  font-family: Roboto, sans-serif;
  line-height: normal;
  letter-spacing: 0.05em;
  width: 100%;

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral300)};
  }
`;

const CardLink = styled.a`
  text-decoration: none;
  color: inherit;
  display: block;
  width: 100%;
  height: 100%;

  &:hover ${CardTitle} {
    text-decoration: underline;
  }
`;

const NewsCard: React.FC<NewsCardProps> = ({ image, title, text, link }) => {
  const cardContent = (
    <CardContent>
      <ImageContainer>
        <CardImage src={image} alt={title} />
      </ImageContainer>
      <TextContainer>
        <CardTitle>{title}</CardTitle>
        <CardText>{text}</CardText>
      </TextContainer>
    </CardContent>
  );

  if (link) {
    return (
      <Card>
        <CardLink href={link}>{cardContent}</CardLink>
      </Card>
    );
  }

  return <Card>{cardContent}</Card>;
};

const HardhatNews = ({ content }: Props) => {
  return (
    <Section clearPadding>
      <Wrapper>
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
      </Wrapper>
    </Section>
  );
};

export default HardhatNews;
