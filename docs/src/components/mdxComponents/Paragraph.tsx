import React from "react";
import { styled } from "linaria/react";

import { media, tm, tmDark, tmSelectors } from "../../themes";

export interface Props {
  children: string | JSX.Element[] | JSX.Element;
}

const StyledP = styled.p`
  margin: 16px 0;
  line-height: 1.7;
  font-size: 16px;
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

const Paragraph = ({ children }: Props) => {
  return <StyledP>{children}</StyledP>;
};

export default Paragraph;
