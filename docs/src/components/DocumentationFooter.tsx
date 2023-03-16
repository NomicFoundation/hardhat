import React from "react";
import Link from "next/link";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmSelectors } from "../themes";
import ExternalLinkIcon from "../assets/icons/external-link-icon";
import FooterArrow from "../assets/icons/footer-arrow";
import { FooterNavigation } from "./types";

type Props = FooterNavigation;

const Footer = styled.footer`
  display: flex;
  width: 100%;
  flex-direction: column;
  margin-top: 74px;
  padding: 0 34px;
  font-size: 10px;

  & a {
    cursor: pointer;
    &:hover {
      opacity: 0.8;
    }
  }

  ${media.md} {
    padding: 0 140px;
    font-size: 16px;
  }
`;

const PageEdit = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  padding-bottom: 16px;
  font-weight: 700;
  line-height: 150%;
  border-bottom: 1px solid ${tm(({ colors }) => colors.neutral400)};
  color: ${tm(({ colors }) => colors.editPageColor)};
  stroke: ${tm(({ colors }) => colors.editPageColor)};

  ${tmSelectors.dark} {
    stroke: ${tmDark(({ colors }) => colors.editPageColor)};
    color: ${tmDark(({ colors }) => colors.editPageColor)};
    border-color: ${tmDark(({ colors }) => colors.neutral400)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      stroke: ${tmDark(({ colors }) => colors.editPageColor)};
      color: ${tmDark(({ colors }) => colors.editPageColor)};
      border-color: ${tmDark(({ colors }) => colors.neutral400)};
    }
  }
`;

const PageNavigation = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  padding: 16px 0 48px;
`;

const PageNavigationLinkWrapper = styled.div`
  & .arrow-reversed {
    transform: scaleX(-1);
    margin-right: 12px;
  }
  & > a {
    display: inline-flex;
    align-items: center;
    & > span {
      margin-right: 12px;
    }
  }
  font-weight: 700;
  color: ${tm(({ colors }) => colors.accent700)};
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.accent700)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.accent700)};
    }
  }
`;

const ImprovePageLinkWrapper = styled.div`
  & > a {
    & > span {
      max-width: 100px;
      display: flex;
      align-items: center;
      & > svg {
        min-width: 20px;
        ${media.sm} {
          margin-left: 10px;
        }
      }
      ${media.sm} {
        max-width: unset;
      }
    }
  }
`;

const LastUpdatedWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  max-width: 80px;
  & > span:last-child {
    font-weight: 300;
    margin-left: 8px;
  }
  ${media.sm} {
    max-width: unset;
  }
`;

const DocumentationFooter = ({ next, prev, lastEditDate, editLink }: Props) => {
  const date = lastEditDate ? new Date(lastEditDate).toLocaleString() : "";
  return (
    <Footer>
      <PageEdit>
        {editLink ? (
          <ImprovePageLinkWrapper>
            <a href={editLink} target="_blank" rel="noopener noreferrer">
              <span>
                Help us improve this page <ExternalLinkIcon />
              </span>
            </a>
          </ImprovePageLinkWrapper>
        ) : (
          <div />
        )}
        {date ? (
          <LastUpdatedWrapper>
            <span>Last Updated:</span>
            <span>{date}</span>
          </LastUpdatedWrapper>
        ) : (
          <div />
        )}
      </PageEdit>
      <PageNavigation>
        {prev !== false && prev?.href !== undefined ? (
          <PageNavigationLinkWrapper>
            <Link href={prev.href}>
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a>
                <FooterArrow className="arrow-reversed" />
                <span>{prev.label}</span>
              </a>
            </Link>
          </PageNavigationLinkWrapper>
        ) : (
          <div />
        )}
        {next !== false && next?.href !== undefined ? (
          <PageNavigationLinkWrapper>
            <Link href={next.href}>
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a>
                <span>{next.label}</span>
                <FooterArrow />
              </a>
            </Link>
          </PageNavigationLinkWrapper>
        ) : (
          <div />
        )}
      </PageNavigation>
    </Footer>
  );
};

export default DocumentationFooter;
