import React from "react";
import { styled } from "linaria/react";

import { media, tm, tmDark, tmHCDark, tmSelectors } from "../../themes";

interface Props {
  children: string | JSX.Element[] | JSX.Element;
}

const StyledP = styled.p`
  margin: 16px 0;
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

const Paragraph = ({ children }: Props) => {
  return <StyledP>{children}</StyledP>;
};

export default Paragraph;
