import React from "react";
import Link from "next/link";
import { styled } from "linaria/react";
import { breakpoints, media } from "../../themes";
import useWindowSize from "../../hooks/useWindowSize";

// We don't use the theme here as this is a quickfix, and it doesn't change
// depending on dark/light mode.
const alphaBannerBackground = "#4F00A3" as const;
const alphaBannerText = "#F2F2F2" as const;
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

  align-items: center;
  background-color: ${alphaBannerBackground};
  color: ${alphaBannerText};

  white-space: nowrap;
  cursor: pointer;

  font-weight: 400;
  letter-spacing: 0.03em;
  vertical-align: middle;
  text-align: center;

  font-size: 15px;

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

  ${media.smd} {
    font-size: 18px;
    padding-bottom: unset;

    span.bannerContent {
      padding-top: 3px;
    }
  }
`;

const AlphaBanner = () => {
  const windowSize = useWindowSize();
  const isDesktop = breakpoints.smd <= windowSize.width;

  return (
    <Link href="/hardhat3-alpha" passHref>
      <AlphaBannerContainer>
        <span className="braket">[</span>
        <span className="bannerContent">
          {isDesktop ? (
            <>
              <b>Hardhat 3 alpha</b>: Rust rewrite, Solidity tests, multi-chain,
              and more
            </>
          ) : (
            <>Try the Hardhat 3 alpha release</>
          )}
        </span>

        <span className="braket">]</span>
      </AlphaBannerContainer>
    </Link>
  );
};

export default AlphaBanner;
