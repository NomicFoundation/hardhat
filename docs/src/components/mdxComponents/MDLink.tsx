import React, { ReactElement } from "react";
import { styled } from "linaria/react";
import Link from "next/link";
import { media, tm, tmDark, tmHCDark, tmSelectors } from "../../themes";
import ExternalLinkIcon from "../../assets/icons/external-link-icon";

interface Props {
  children: string | ReactElement;
  href: string;
}

const StyledMdLinkContainer = styled.span`
  & > a {
    color: ${tm(({ colors }) => colors.link)};
  }
  margin: 0 2px;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }

  & code {
    color: ${tm(({ colors }) => colors.link)};
  }

  & svg {
    margin-left: 2px;
    stroke: ${tmDark(({ colors }) => colors.neutral800)};
    ${tmSelectors.hcDark} {
      stroke: ${tmHCDark(({ colors }) => colors.neutral800)};
    }
    ${tmSelectors.dark} {
      stroke: ${tmDark(({ colors }) => colors.neutral800)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        stroke: ${tmDark(({ colors }) => colors.neutral800)};
      }
    }
  }
`;

const getPathFromHref = (href: string) => {
  const pathname = href
    .split("/")
    .filter((hrefPart: string) => ![".", ".."].includes(hrefPart))
    .join("/")
    .toLowerCase();

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
};

const renderLinkByType = ({
  children,
  href,
  isExternalLink,
  isAnchor,
}: Props & { isExternalLink: boolean; isAnchor: boolean }) => {
  if (isExternalLink) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  if (isAnchor) {
    return <a href={href}>{children}</a>;
  }

  return (
    <Link href={getPathFromHref(href.replace(/\.md$/, ""))}>
      {/* eslint-disable-next-line */}
      <a>{children}</a>
    </Link>
  );
};

const MDLink = ({ children, href }: Props) => {
  const isExternalLink = href.startsWith("http");
  const isAnchor = href.startsWith("#");

  return (
    <StyledMdLinkContainer>
      {renderLinkByType({ href, children, isAnchor, isExternalLink })}
      {isExternalLink && <ExternalLinkIcon />}
    </StyledMdLinkContainer>
  );
};

export default MDLink;
