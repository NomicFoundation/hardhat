import React, { FC } from "react";
import { styled } from "linaria/react";
import { css } from "linaria";
import { tm } from "../../themes";

interface HamburgerProps {
  isOpen: boolean;
  onClick: () => void;
}

type HamburgerLinePosition = "top" | "mid" | "bot";

interface HamburgerLineProps {
  isOpen: boolean;
  position: HamburgerLinePosition;
}

const HamburgerContainer = styled.button`
  width: 44px;
  height: 32px;
  display: flex;
  padding: 8px;
  border: none;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 4px;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  &:hover {
    cursor: pointer;
  }
`;

const HamburgerLine = styled.div`
  background-color: ${tm(({ colors }) => colors.neutral900)};
  height: 2px;
  width: 28px;
  transform-origin: left;
  user-select: none;
  transition: all 0.25s ease-in-out;
  &[data-open="true"] {
    &[data-position="top"] {
      transform: rotate(45deg) translate(1px, -5px);
    }
    &[data-position="mid"] {
      opacity: 0;
    }
    &[data-position="bot"] {
      transform: rotate(-45deg) translate(1px, 5px);
    }
  }
  &[data-position="mid"] {
    width: 19px;
    transition: all 0.1s ease-out;
  }
`;

const Hamburger = (props: HamburgerProps) => {
  const { onClick, isOpen } = props;

  return (
    <HamburgerContainer onClick={() => onClick()}>
      <HamburgerLine data-open={isOpen} data-position="top" />
      <HamburgerLine data-open={isOpen} data-position="mid" />
      <HamburgerLine data-open={isOpen} data-position="bot" />
    </HamburgerContainer>
  );
};

export default React.memo(Hamburger);
