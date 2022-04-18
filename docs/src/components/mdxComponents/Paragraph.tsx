import React from "react";
import { styled } from "linaria/react";
import { NextComponentType } from "next";

import { appTheme, tm, tmDark, tmHCDark, tmSelectors } from "../../themes";

const { media } = appTheme;

const StyledP = styled.p`
  margin: 16px 0 0;
  line-height: 1.7;
  font-size: 16px;
  font-family: ChivoLight, sans-serif;
  color: ${tm(({ colors }) => colors.neutral800)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral700)};
  }

  ${tmSelectors.hcDark} {
    color: ${tmHCDark(({ colors }) => colors.neutral700)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral700)};
    }
  }
`;

const Paragraph: NextComponentType = ({ children }) => {
  return <StyledP>{children}</StyledP>;
};

export default Paragraph;
