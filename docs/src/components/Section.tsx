import React from "react";
import { styled } from "linaria/react";
import { media } from "../themes";

const Container = styled.section`
  width: 100%;
  box-sizing: border-box;
  position: relative;
  padding: 0 24px;
  max-width: 960px;
  ${media.md} {
    padding: 0;
  }
  &.clear-padding {
    padding: unset;
    max-width: unset;
  }
`;

type Props = React.PropsWithChildren<{
  clearPadding?: boolean;
  id?: string | number;
}>;

const Section = ({ children, clearPadding = false, id }: Props) => {
  const containerProps = {
    // eslint-disable-next-line
    [id ? "id" : ""]: id,
  };
  delete containerProps[""];

  return (
    <Container
      className={clearPadding ? "clear-padding" : ""}
      {...containerProps}
    >
      {children}
    </Container>
  );
};

export default Section;
