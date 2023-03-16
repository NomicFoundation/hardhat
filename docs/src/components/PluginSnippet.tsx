import React from "react";
import Link from "next/link";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmSelectors } from "../themes";
import { IPlugin } from "../model/types";

const StyledPluginSnippetContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 50px;
`;

const PluginNameAuthorContainer = styled.div`
  display: flex;
  flex-direction: column;
  ${media.md} {
    flex-direction: row;
    align-items: center;
  }
`;

const PluginName = styled.a`
  font-size: 20px;
  line-height: 150%;
  font-weight: 700;
  color: ${tm(({ colors }) => colors.accent900)};
  margin-right: 18px;
  &:hover {
    opacity: 0.8;
  }
`;

const Author = styled.a`
  font-size: 16px;
  line-height: 150%;
  color: ${tm(({ colors }) => colors.autoThemeButton)};

  &:hover {
    opacity: 0.8;
  }

  ${media.md} {
    padding-left: 8px;
    border-left: 1px solid ${tm(({ colors }) => colors.autoThemeButton)};
  }

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.autoThemeButton)};
    border-color: ${tmDark(({ colors }) => colors.autoThemeButton)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.autoThemeButton)};
      border-color: ${tmDark(({ colors }) => colors.autoThemeButton)};
    }
  }
`;

const Description = styled.p`
  font-size: 16;
  line-height: 150%;
  width: 100%;
  margin-top: 12px;
  color: ${tm(({ colors }) => colors.neutral800)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral800)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral800)};
    }
  }
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-top: 16px;
`;

const Tag = styled.div`
  padding: 4px 16px;
  margin: 8px 8px 0 0;
  border-radius: 5px;
  font-size: 13px;
  line-height: 19.5px;
  background-color: ${tm(({ colors }) => colors.tagBackground)};
  color: ${tm(({ colors }) => colors.codeColor)};

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.tagBackground)};
    color: ${tmDark(({ colors }) => colors.codeColor)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.tagBackground)};
      color: ${tmDark(({ colors }) => colors.codeColor)};
    }
  }
`;

const PluginSnippet = ({
  name,
  author,
  authorUrl,
  description,
  tags,
  href,
}: IPlugin & { href: string }) => {
  const isExternalLink = href.startsWith("http");

  return (
    <StyledPluginSnippetContainer>
      <PluginNameAuthorContainer>
        {isExternalLink ? (
          <PluginName href={href} target="_blank" rel="noreferrer">
            {name}
          </PluginName>
        ) : (
          <Link href={href} passHref>
            {/* eslint-disable-next-line */}
            <PluginName>{name}</PluginName>
          </Link>
        )}
        <Author href={authorUrl} target="_blank" rel="noreferrer">
          {author}
        </Author>
      </PluginNameAuthorContainer>
      <Description>{description}</Description>
      <TagsContainer>
        {tags.map((tagName) => (
          <Tag key={tagName}>{tagName}</Tag>
        ))}
      </TagsContainer>
    </StyledPluginSnippetContainer>
  );
};

export default PluginSnippet;
