import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { styled } from "linaria/react";

import ethereumLogo from "../assets/animation/mobile/ethereum_logo.svg";
import ethereumLogoDark from "../assets/animation/mobile/ethereum_logo-dark.svg";
import mascots from "../assets/animation/mobile/mascots.svg";
import heEyesOpen from "../assets/animation/mobile/he-eyes_open.svg";
import sheEyesOpen from "../assets/animation/mobile/she-eyes_open.svg";
import { media, tmSelectors } from "../themes";

const AnimationContainer = styled.section`
  width: 300px;
  height: 152px;
  position: fixed;
  bottom: 0;
  left: 50%;
  z-index: 1;
  transform: translateX(-30%) scale(0.7);
  pointer-events: none;
  transform-origin: bottom center;

  ${media.xxs} {
    transform: translateX(-50%) scale(0.85);
  }
  ${media.sm} {
    transform: translateX(-50%) scale(1.2);
  }
  ${media.smd} {
    transform: translateX(-50%) scale(1.7);
  }
  ${media.md} {
    display: none;
  }
  & .light {
    display: inline;
  }
  & .dark {
    display: none;
  }
  ${tmSelectors.dark} {
    & .light {
      display: none;
    }
    & .dark {
      display: inline;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      & .light {
        display: none;
      }
      & .dark {
        display: inline;
      }
    }
  }
`;

const Anchor = styled.span`
  height: 0;
  width: 0;
  visibility: hidden;
  position: absolute;
  top: 0;
  left: 0;
  ${media.md} {
    display: block;
  }
`;

const EthereumLogoContainer = styled.span<{ anchorPosition: number }>`
  position: absolute;
  bottom: -20px;
  left: 55px;
  opacity: ${({ anchorPosition }) => (100 + anchorPosition * 0.8) / 100};
`;
const MascotsContainer = styled.span<{ anchorPosition: number }>`
  position: absolute;
  bottom: ${({ anchorPosition }) => `${anchorPosition}px`};
  left: 5px;
  & .he-eyes {
    bottom: 48px;
    left: 182px;
    animation: blink 8s linear infinite;
    animation-delay: 1s;
    position: absolute;
  }
  & .she-eyes {
    bottom: 60px;
    left: 48px;
    animation: blink 8s linear infinite;
    position: absolute;
  }
  @keyframes blink {
    0% {
      transform: none;
    }
    39% {
      transform: none;
    }
    40% {
      transform: matrix(1, 0, 0, 0.2, 0, 0);
    }
    41% {
      transform: none;
    }
    100% {
      transform: none;
    }
  }
`;

const defaultTopPosition = 140;

const validateAnchorPosition = (
  anchorPosition: number,
  defaultAnchorPosition: number
) => {
  return anchorPosition - defaultAnchorPosition > 0
    ? 0
    : anchorPosition - defaultAnchorPosition;
};

const MobileAnimation = () => {
  const [anchorPosition, setAnchorPosition] = useState(0);
  const anchorRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const listener = () => {
      const anchorTopPosition =
        anchorRef.current?.getBoundingClientRect()?.top ?? 0;

      const validatedAnchorPosition = validateAnchorPosition(
        anchorTopPosition,
        defaultTopPosition
      );

      setAnchorPosition(validatedAnchorPosition);
    };
    document.addEventListener("scroll", listener);

    // eslint-disable-next-line
    return () => {
      document.removeEventListener("scroll", listener);
    };
  }, []);

  return (
    <>
      <AnimationContainer
        onScroll={(e) => {
          e.preventDefault();
        }}
      >
        <EthereumLogoContainer
          anchorPosition={anchorPosition}
          className="ethereum-logo"
        >
          <span className="light">
            <Image src={ethereumLogo} alt="ethereum logo" />
          </span>
          <span className="dark">
            <Image src={ethereumLogoDark} alt="ethereum logo dark" />
          </span>
        </EthereumLogoContainer>
        <MascotsContainer anchorPosition={anchorPosition}>
          <Image src={mascots} alt="mascots" />
          <span className="he-eyes">
            <Image src={heEyesOpen} alt="he-eyes" />
          </span>
          <span className="she-eyes">
            <Image src={sheEyesOpen} alt="she-eyes" />
          </span>
        </MascotsContainer>
      </AnimationContainer>
      <Anchor ref={anchorRef} />
    </>
  );
};

export default MobileAnimation;
