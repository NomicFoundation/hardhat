import React from "react";
import { styled } from "linaria/react";
import { appTheme } from "../themes";

const { media } = appTheme;

const Container = styled.section`
  width: 100%;
  box-sizing: border-box;
  padding: 0 24px;
  position: relative;
  ${media.lg} {
    padding: 0px 240px;
  }
`;

type Props = React.PropsWithChildren<{}>;

const Section = ({ children }: Props) => {
  return <Container>{children}</Container>;
};

export default Section;
