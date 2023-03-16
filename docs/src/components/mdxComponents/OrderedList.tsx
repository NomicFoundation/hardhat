import React from "react";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmSelectors } from "../../themes";

export interface Props {
  children: JSX.Element[] | JSX.Element;
}

const StyledOrderedList = styled.ol`
  padding-left: 1.2em;
  margin-top: 16px;
  font-weight: normal;
  line-height: 1.7;
  color: ${tm(({ colors }) => colors.neutral800)};

  & code {
    line-height: 1.2;
  }

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral800)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral800)};
    }
  }
`;

const OrderedList = ({ children }: Props) => {
  return <StyledOrderedList>{children}</StyledOrderedList>;
};

export default OrderedList;
