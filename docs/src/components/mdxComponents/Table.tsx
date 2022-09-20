import React from "react";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmSelectors } from "../../themes";

export interface Props {
  children: JSX.Element[] | JSX.Element;
}

const StyledTable = styled.table`
  margin: 16px 0;
  width: 100%;
  border-collapse: collapse;
  color: ${tm(({ colors }) => colors.neutral800)};
  border-color: ${tm(({ colors }) => colors.neutral800)};
  overflow-x: auto;
  & thead {
    vertical-align: middle;
  }
  & th {
    font-weight: bold;
  }
  & th,
  & td {
    border: 1px solid ${tm(({ colors }) => colors.tableBorder)};
    padding: 9.6px 16px;
    color: inherit;
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

const Table = ({ children }: Props) => {
  return <StyledTable>{children}</StyledTable>;
};

export default Table;
