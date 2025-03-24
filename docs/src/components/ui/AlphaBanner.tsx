import React from "react";
import Link from "next/link";
import { styled } from "linaria/react";
import { media } from "../../themes";

// We don't use the theme here as this is a quickfix, and it doesn't change
// depending on dark/light mode.
const alphaBannerBackground = "#4F00A3" as const;
const alphaBannerText = "#F2F2F2" as const;
const alphaBannerCTA = "#C4C4C4" as const;
const alphaBannerBraket = "#EDCF00" as const;

const AlphaBannerContainer = styled.section`
  font-family: ChivoRegular, sans-serif;
  user-select: none;
  z-index: 5;
  width: 100%;
  height: 72px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  padding-bottom: 15px;

  align-items: center;
  background-color: ${alphaBannerBackground};
  color: ${alphaBannerText};

  white-space: nowrap;
  cursor: pointer;

  font-weight: 400;
  letter-spacing: 0.03em;
  vertical-align: middle;
  text-align: center;

  font-size: 14px;
  a.CTA {
    font-size: 13px;
  }

  span {
    height: 27px;
    display: inline-block;
  }

  span.bannerContent {
    padding: 0 16px;
    padding-top: 6px;
    position: relative;
  }

  span.braket {
    color: ${alphaBannerBraket};
    font-size: 27px;
    line-height: 27px;
  }

  a.CTA {
    color: ${alphaBannerCTA};
    position: absolute;
    width: 100%;
    left: 0;
    bottom: -15px;
  }

  ${media.smd} {
    font-size: 18px;
    padding-bottom: unset;

    a.CTA {
      position: relative;
      font-size: 18px;
      width: unset;
      left: unset;
      bottom: unset;
      padding-left: 8px;
    }

    span.bannerContent {
      padding-top: 3px;
    }
  }
`;

const AlphaBanner = () => {
  return (
    <Link href="/hardhat3-alpha" passHref>
      <AlphaBannerContainer>
        <span className="braket">[</span>
        <span className="bannerContent">
          <b>Hardhat 3 alpha</b>: Rust rewrite, Solidity tests, multi-chain, and more
          {/* We don't pass href because the Link already does it */}
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        </span>

        <span className="braket">]</span>
      </AlphaBannerContainer>
    </Link>
  );
};

export default AlphaBanner;
