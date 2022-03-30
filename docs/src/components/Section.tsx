import React from "react";
import { styled } from "linaria/react";
import { appTheme } from "../themes";

const { media } = appTheme;

const Container = styled.section`
  width: 100%;
  box-sizing: border-box;
  position: relative;
  padding: 0 24px;
  ${media.lg} {
    padding: 0px 240px;
  }
  &.clear-padding {
    padding: unset;
  }
`;

type Props = React.PropsWithChildren<{
  clearPadding?: boolean;
}>;

const Section = ({ children, clearPadding = false }: Props) => {
  return (
    <Container className={clearPadding ? "clear-padding" : ""}>
      {children}
    </Container>
  );
};

export default Section;
