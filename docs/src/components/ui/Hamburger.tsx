import React from "react";
import { styled } from "linaria/react";
import { tm, appTheme } from "../../themes";

const { media } = appTheme;
interface HamburgerProps {
  isOpen: boolean;
  onClick: () => void;
}

const HamburgerContainer = styled.button`
  width: 44px;
  height: 32px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
  border: none;
  border-radius: 4px;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  cursor: pointer;
  ${media.lg} {
    display: none;
  }
`;

const HamburgerLine = styled.div<{ isOpen: boolean }>`
  background-color: ${tm(({ colors }) => colors.neutral900)};
  height: 2px;
  width: 28px;
  transform-origin: left;
  user-select: none;
  transition: all 0.25s ease-in-out;
  &.mid {
    width: 19px;
    transition: all 0.1s ease-out;
  }
  &.top {
    transform: ${({ isOpen }: { isOpen: boolean }) =>
      isOpen ? "rotate(45deg) translate(1px, -5px)" : "none"};
  }
  &.mid {
    opacity: 0;
    opacity: ${({ isOpen }: { isOpen: boolean }) => (isOpen ? "0" : "1")};
  }
  &.bot {
    transform: ${({ isOpen }: { isOpen: boolean }) =>
      isOpen ? "rotate(-45deg) translate(1px, 5px)" : "none"};
  }
`;

const Hamburger = ({ onClick, isOpen }: HamburgerProps) => {
  return (
    <HamburgerContainer onClick={() => onClick()}>
      <HamburgerLine isOpen={isOpen} className="top" />
      <HamburgerLine isOpen={isOpen} className="mid" />
      <HamburgerLine isOpen={isOpen} className="bot" />
    </HamburgerContainer>
  );
};

export default Hamburger;
