import React from "react";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmHCDark, tmSelectors } from "../../themes";

interface CodeProps {
  children: string | JSX.Element[] | JSX.Element;
  lang?: string;
  highlightedLines?: string;
}

interface PreProps {
  children: string | JSX.Element[] | JSX.Element;
}

const StyledCode = styled.code`
  padding: 4px 8px;
  background-color: ${tm(({ colors }) => colors.codeBackground)};
  border-radius: 3px;
  font-size: 13.6px;
  font-family: ChivoLight, sans-serif;
  font-weight: 600;
  line-height: 1.7;
  color: ${tm(({ colors }) => colors.codeColor)};

  &[data-language=""] {
    font-family: source-code-pro, Menlo, Monaco, Consolas, Courier New,
      monospace;
    font-weight: normal;
  }

  h3 & {
    font-size: inherit;
    font-family: inherit;
    font-weight: inherit;
    line-height: inherit;
  }

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.codeBlockBackground)};

    color: ${tmDark(({ colors }) => colors.codeColor)};
  }

  ${tmSelectors.hcDark} {
    background-color: ${tmHCDark(({ colors }) => colors.codeBackground)};
    color: ${tmHCDark(({ colors }) => colors.codeColor)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.codeBlockBackground)};
      color: ${tmDark(({ colors }) => colors.codeColor)};
    }
  }
`;

const StyledPre = styled.pre`
  margin: 16px 0;
  padding: 20px 24px;
  background-color: ${tm(({ colors }) => colors.codeBlockBackground)};
  border-radius: 6px;
  overflow: auto;
  border: 1px solid ${tmHCDark(({ colors }) => colors.transparent)};

  & code {
    padding: 0;
    color: ${tm(({ colors }) => colors.preCodeColor)};
    line-height: 1.4;
    font-size: 0.85em;
    font-family: "Menlo", sans-serif;
    font-weight: 300;
  }

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.codeBlockBackground)};
    border: 1px solid ${tmDark(({ colors }) => colors.codeBlockBorder)};
    & code {
      color: ${tmDark(({ colors }) => colors.preCodeColor)};
    }
  }

  ${tmSelectors.hcDark} {
    background-color: ${tmHCDark(({ colors }) => colors.codeBlockBackground)};
    border: 1px solid ${tmHCDark(({ colors }) => colors.codeBlockBorder)};
    & code {
      color: ${tmHCDark(({ colors }) => colors.preCodeColor)};
    }
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.codeBlockBackground)};
      border: 1px solid ${tmDark(({ colors }) => colors.codeBlockBorder)};
      & code {
        color: ${tmDark(({ colors }) => colors.preCodeColor)};
      }
    }
  }
`;

const Code = ({ children, lang, highlightedLines }: CodeProps) => {
  return (
    <StyledCode
      lang={lang ?? ""}
      data-language={lang ?? ""}
      data-line={highlightedLines ?? ""}
    >
      {children}
    </StyledCode>
  );
};

const Pre = ({ children }: PreProps) => {
  return <StyledPre>{children}</StyledPre>;
};

const CodeBlocks = {
  Code,
  Pre,
};

export default CodeBlocks;
