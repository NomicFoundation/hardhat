import React from "react";
import Image from "next/image";
import { styled } from "linaria/react";

import heroBackTextureReflect from "../assets/animation/desktop/hero-back_texture_reflect.svg";
import heroBackTexture from "../assets/animation/desktop/hero-back_texture.svg";
import heroBackTextureDark from "../assets/animation/desktop/hero-back_texture-dark.svg";
import mascotsEthereumLogo from "../assets/animation/desktop/mascots-ethereum_logo.svg";
import mascotsEthereumLogoDark from "../assets/animation/desktop/mascots-ethereum_logo-dark.svg";
import heHead from "../assets/animation/desktop/he-head.svg";
import sheHead from "../assets/animation/desktop/she-head.svg";
import heEyesOpen from "../assets/animation/desktop/he-eyes_open.svg";
import sheEyesOpen from "../assets/animation/desktop/she-eyes_open.svg";
import shadow from "../assets/animation/desktop/shadow.svg";
import shadowDark from "../assets/animation/desktop/shadow-dark.svg";
import { media, tmSelectors } from "../themes";

const AnimationContainer = styled.section`
  display: none;
  width: 580px;
  height: 685px;
  position: absolute;
  ${media.md} {
    display: block;
    left: -72px;
  }
  ${media.lg} {
    left: 0px;
  }

  & > .bounce {
    background-color: transparent;
    height: 100%;
    width: 100%;
    & > span {
      position: absolute;
    }
    animation: bounce 8s linear infinite;
  }

  & > span {
    position: absolute;
    z-index: 1;
  }
  & .back-texture {
    z-index: 0;
    top: -100px;
    left: 50px;
  }

  & .back-reflect {
    z-index: 0;
    ${tmSelectors.dark} {
      display: none;
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        display: none;
      }
    }
  }

  & .mascots-ethereum-logo {
    top: 0;
    left: 120px;
  }
  & .he-head {
    top: 130px;
    left: 293px;
    animation: headShake 8s linear infinite;
    animation-delay: 1s;
  }
  & .he-eyes {
    top: 240px;
    left: 330px;
    animation: blink 8s linear infinite;
    animation-delay: 1s;
  }
  & .she-head {
    top: 134px;
    left: 145.5px;
    animation: headShake 8s linear infinite;
  }
  & .she-eyes {
    top: 243px;
    left: 198px;
    animation: blink 8s linear infinite;
  }
  & .shadow {
    bottom: 30px;
    left: 220px;
    animation: shadowSpread 8s linear infinite;
    z-index: 0;
    ${tmSelectors.dark} {
      fill: "#111316";
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        fill: "#111316";
      }
    }
  }
  @keyframes bounce {
    0% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(40px);
    }
    100% {
      transform: translateY(0);
    }
  }

  @keyframes shadowSpread {
    0% {
      transform: none;
    }
    50% {
      transform: scaleX(1.6);
    }
    100% {
      transform: none;
    }
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

  @keyframes headShake {
    0% {
      transform: none;
    }
    39% {
      transform: none;
    }
    40% {
      transform: translateY(2px);
    }
    41% {
      transform: none;
    }
    100% {
      transform: none;
    }
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

const DesktopAnimation = () => {
  return (
    <AnimationContainer>
      <span className="back-reflect">
        <Image src={heroBackTextureReflect} alt="back reflect" />
      </span>
      <span className="back-texture">
        <span className="light">
          <Image
            src={heroBackTexture}
            alt="back texture"
            width={813}
            height={840}
            layout="fixed"
          />
        </span>
        <span className="dark">
          <Image
            src={heroBackTextureDark}
            alt="back texture dark"
            width={813}
            height={840}
            layout="fixed"
          />
        </span>
      </span>
      <div className="bounce">
        <span className="mascots-ethereum-logo">
          <span className="light">
            <Image src={mascotsEthereumLogo} alt="mascots ethereum logo" />
          </span>
          <span className="dark">
            <Image
              src={mascotsEthereumLogoDark}
              alt="mascots ethereum logo dark"
            />
          </span>
        </span>
        <span className="he-head">
          <Image src={heHead} alt="he-head" />
        </span>
        <span className="he-eyes">
          <Image src={heEyesOpen} alt="he-eyes" />
        </span>

        <span className="she-head">
          <Image src={sheHead} alt="she-head" />
        </span>
        <span className="she-eyes">
          <Image src={sheEyesOpen} alt="she-eyes" />
        </span>
      </div>
      <span className="shadow">
        <span className="light">
          <Image src={shadow} alt="shadow" />
        </span>
        <span className="dark">
          <Image src={shadowDark} alt="shadow-dark" />
        </span>
      </span>
    </AnimationContainer>
  );
};

export default DesktopAnimation;
