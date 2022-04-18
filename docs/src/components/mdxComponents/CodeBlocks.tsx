import React from "react";
import { styled } from "linaria/react";
import { NextComponentType } from "next";
import { appTheme, tm, tmDark, tmHCDark, tmSelectors } from "../../themes";

const { media } = appTheme;

const StyledCode = styled.code`
  padding: 4px 8px;
  background-color: ${tm(({ colors }) => colors.codeBackground)};
  border-radius: 3px;
  font-size: 14px;
  font-family: ChivoLight, sans-serif;
  font-weight: 600;
  line-height: 1.7;
  letter-spacing: 2px;
  color: ${tm(({ colors }) => colors.codeColor)};

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral200)};
    color: ${tmDark(({ colors }) => colors.codeColor)};
  }

  ${tmSelectors.hcDark} {
    background-color: ${tmHCDark(({ colors }) => colors.neutral200)};
    color: ${tmHCDark(({ colors }) => colors.codeColor)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.neutral200)};
      color: ${tmDark(({ colors }) => colors.codeColor)};
    }
  }
`;

const StyledPre = styled.pre`
  margin-top: 16px;
  padding: 20px 24px;
  background-color: ${tm(({ colors }) => colors.codeBlockBackground)};
  border-radius: 6px;
  overflow: auto;

  & code {
    padding: 0;
    color: ${tm(({ colors }) => colors.neutral0)};
    line-height: 1.4;
    font-size: 14px;
    font-family: Menlo, sans-serif;
    font-weight: 300;
    letter-spacing: 2px;
  }

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral200)};
    color: ${tmDark(({ colors }) => colors.codeColor)};
  }

  ${tmSelectors.hcDark} {
    background-color: ${tmHCDark(({ colors }) => colors.neutral200)};
    border: 1px solid ${tmHCDark(({ colors }) => colors.codeBlockBorder)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.neutral200)};
      border: 1px solid ${tmDark(({ colors }) => colors.codeBlockBorder)};
    }
  }
`;

const Code: NextComponentType = ({ children }) => {
  return <StyledCode>{children}</StyledCode>;
};

const Pre: NextComponentType = ({ children }) => {
  return <StyledPre>{children}</StyledPre>;
};

const CodeBlocks = {
  Code,
  Pre,
};

export default CodeBlocks;
