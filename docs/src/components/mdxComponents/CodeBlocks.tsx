import React from "react";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmHCDark, tmSelectors } from "../../themes";

interface Props {
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
  letter-spacing: 2px;
  color: ${tm(({ colors }) => colors.codeColor)};

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
    color: ${tm(({ colors }) => colors.codeColor)};
    line-height: 1.4;
    font-size: 14px;
    font-family: Menlo, sans-serif;
    font-weight: 300;
    letter-spacing: 2px;
  }

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.codeBlockBackground)};
    border: 1px solid ${tmDark(({ colors }) => colors.codeBlockBorder)};
    & code {
      color: ${tmDark(({ colors }) => colors.codeColor)};
    }
  }

  ${tmSelectors.hcDark} {
    background-color: ${tmHCDark(({ colors }) => colors.codeBlockBackground)};
    border: 1px solid ${tmHCDark(({ colors }) => colors.codeBlockBorder)};
    & code {
      color: ${tmHCDark(({ colors }) => colors.codeColor)};
    }
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.codeBlockBackground)};
      border: 1px solid ${tmDark(({ colors }) => colors.codeBlockBorder)};
      & code {
        color: ${tmDark(({ colors }) => colors.codeColor)};
      }
    }
  }
`;

const Code = ({ children }: Props) => {
  return <StyledCode lang="js">{children}</StyledCode>;
};

const Pre = ({ children }: Props) => {
  return <StyledPre>{children}</StyledPre>;
};

const CodeBlocks = {
  Code,
  Pre,
};

export default CodeBlocks;
