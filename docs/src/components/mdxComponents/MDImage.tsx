// @ts-nocheck
import React from "react";
import Image from "next/image";
import { styled } from "linaria/react";

export interface Props {
  src: string;
  alt: string;
}

// TODO: solve the issue with badges
const ImageContainer = styled.div`
  max-width: 100%;
  position: relative;
  width: ${({ width }) => width};
  img {
    width: ${({ width }) => width};
    height: auto;
  }
  & .md-img {
    position: relative !important;
    height: unset !important;
  }
  & span {
    padding: 0 !important;
  }

  span & div {
    width: 120px !important;
  }
`;

const isShellBadge = (src: string): boolean => /img\.shields\.io/.test(src);
const isHardhatBadge = (alt: string): boolean => alt === "hardhat";

const calcImgWidth = ({ isShellBdg, isHardhatBdg }) => {
  if (isHardhatBdg) return "140px";
  if (isShellBdg) return "80px";
  return null;
};

const MDImage = ({ src, alt }: Props) => {
  const isHardhatBdg = isHardhatBadge(alt);
  const isShellBdg = isShellBadge(src);

  return (
    <ImageContainer
      width={calcImgWidth({ isHardhatBdg, isShellBdg })}
      className={isHardhatBdg ? "hardhat-badge" : null}
    >
      <Image
        className="md-img"
        src={src}
        alt={alt}
        width="100%"
        height="100%"
        quality={100}
        layout="responsive"
        objectFit="contain"
      />
    </ImageContainer>
  );
};

export default MDImage;
