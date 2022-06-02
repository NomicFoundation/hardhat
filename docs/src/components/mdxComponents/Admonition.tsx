import React from "react";
import { styled } from "linaria/react";
import { NextComponentType } from "next";
import { tm, tmDark, tmSelectors, media } from "../../themes";

const StyledAdmonition = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 16px 0;
  padding: 16px 24px;
  background-color: ${tm(({ colors }) => colors.tipBackgroundColor)};
  border-left: 0.5rem solid ${tm(({ colors }) => colors.tipBorderColor)};
  font-size: 14px;
  font-weight: 400;
  line-height: 1.7;
  color: ${tm(({ colors }) => colors.neutral800)};
  & .title {
    font-size: 16px;
    font-weight: 700;
  }
  &.warning {
    & .title {
      color: ${tm(({ colors }) => colors.warningColorTitle)};
    }
    & p {
      color: ${tm(({ colors }) => colors.warningColorText)};
    }
    border-color: ${tm(({ colors }) => colors.warningBorderColor)};
    background-color: ${tm(({ colors }) => colors.warningBackgroundColor)};
  }

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.tipBackgroundColor)};
    color: ${tmDark(({ colors }) => colors.neutral900)};
    &.warning {
      & .title {
        color: ${tmDark(({ colors }) => colors.warningColorTitle)};
      }
      & p {
        color: ${tmDark(({ colors }) => colors.warningColorText)};
      }
      border-color: ${tmDark(({ colors }) => colors.warningBorderColor)};
      background-color: ${tmDark(
        ({ colors }) => colors.warningBackgroundColor
      )};
    }
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.tipBackgroundColor)};
      color: ${tmDark(({ colors }) => colors.neutral900)};
      &.warning {
        & .title {
          color: ${tmDark(({ colors }) => colors.warningColorTitle)};
        }
        & p {
          color: ${tmDark(({ colors }) => colors.warningColorText)};
        }
        border-color: ${tmDark(({ colors }) => colors.warningBorderColor)};
        background-color: ${tmDark(
          ({ colors }) => colors.warningBackgroundColor
        )};
      }
    }
  }
`;

const Tip: NextComponentType = ({ children }) => {
  return (
    <StyledAdmonition>
      <p className="title">TIP</p>
      {children}
    </StyledAdmonition>
  );
};

const Warning: NextComponentType = ({ children }) => {
  return (
    <StyledAdmonition className="warning">
      <p className="title">WARNING</p>
      {children}
    </StyledAdmonition>
  );
};

const Admonition = {
  Tip,
  Warning,
};

export default Admonition;
