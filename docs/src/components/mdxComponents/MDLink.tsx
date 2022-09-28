import React, { ReactElement } from "react";
import { styled } from "linaria/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { media, tm, tmDark, tmSelectors } from "../../themes";
import ExternalLinkIcon from "../../assets/icons/external-link-icon";

export interface Props {
  children: string | ReactElement;
  href: string;
}

const StyledMdLinkContainer = styled.span`
  & > a {
    color: ${tm(({ colors }) => colors.link)};
  }
  margin: 0 2px;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }

  & > a {
    display: inline-flex;
    align-items: center;
  }

  & .hardhat-badge + svg {
    margin-left: -30px;
  }

  & code {
    color: ${tm(({ colors }) => colors.link)};
  }
  & svg {
    margin-left: 2px;
    stroke: ${tmDark(({ colors }) => colors.neutral800)};
  }

  ${tmSelectors.dark} {
    & svg {
      stroke: ${tmDark(({ colors }) => colors.neutral800)};
    }
    & code {
      color: ${tm(({ colors }) => colors.link)};
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      & svg {
        stroke: ${tmDark(({ colors }) => colors.neutral800)};
      }
      & code {
        color: ${tm(({ colors }) => colors.link)};
      }
    }
  }
`;

const getAbsoluteHrefFromAbsolutePath = (href: string): string => {
  return (
    href
      // the lookahead is to prevent links like /indexing.md from being broken
      .replace(/\/index(?=\.)/, "")
      // remove the .md/.mdx extension but preserve the anchor
      .replace(/\.mdx?(#.*)?$/, "$1")
  );
};

const getAbsoluteHrefFromRelativePath = (href: string, currentHref: string) => {
  const pathSegments = currentHref
    .split("/")
    .filter((segment) => segment !== "");
  const pathSegmentsCount = pathSegments.length;

  let hrefSegments = href.split("/").filter((segment) => segment !== ".");
  const upperLevelsCount = hrefSegments.filter(
    (segment) => segment === ".."
  ).length;

  // remove the ".." segments after counting them
  hrefSegments = hrefSegments.filter((segment) => segment !== "..");

  const baseSegmentsCount = Math.max(
    pathSegmentsCount - 1 - upperLevelsCount,
    0
  );

  const baseSegments = pathSegments.slice(0, baseSegmentsCount);

  const newSegments = ["", ...baseSegments, ...hrefSegments];

  return getAbsoluteHrefFromAbsolutePath(newSegments.join("/"));
};

const renderLinkByType = ({
  children,
  href,
  isExternalLink,
  isAnchor,
  isAbsoluteLink,
  currentHref,
}: Props & {
  isExternalLink: boolean;
  isAnchor: boolean;
  isAbsoluteLink: boolean;
  currentHref: string;
}) => {
  if (isExternalLink) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
        <ExternalLinkIcon />
      </a>
    );
  }
  if (isAnchor) {
    return <a href={href}>{children}</a>;
  }
  if (isAbsoluteLink) {
    return (
      <Link href={getAbsoluteHrefFromAbsolutePath(href)}>
        {/* eslint-disable-next-line */}
        <a>{children}</a>
      </Link>
    );
  }

  return (
    <Link href={getAbsoluteHrefFromRelativePath(href, currentHref)}>
      {/* eslint-disable-next-line */}
      <a>{children}</a>
    </Link>
  );
};

const MDLink = ({ children, href }: Props) => {
  const router = useRouter();
  const isExternalLink = href.startsWith("http");
  const isAbsoluteLink = href.startsWith("/");
  const isAnchor = href.startsWith("#");

  return (
    <StyledMdLinkContainer>
      {renderLinkByType({
        href,
        children,
        isAnchor,
        isExternalLink,
        isAbsoluteLink,
        currentHref: router.asPath,
      })}
    </StyledMdLinkContainer>
  );
};

export default MDLink;
