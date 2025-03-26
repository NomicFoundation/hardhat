"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import getImage from "../utils";

gsap.registerPlugin(ScrollTrigger);

const useImageAnimation = (content: any, screenWidth: number) => {
  const [activeImageLight, setActiveImageLight] = useState(
    getImage(content.featureCards[0], screenWidth, "light")
  );
  const [activeImageDark, setActiveImageDark] = useState(
    getImage(content.featureCards[0], screenWidth, "dark")
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  const updateImage = (index: number) => {
    setActiveImageLight(
      getImage(content.featureCards[index], screenWidth, "light")
    );
    setActiveImageDark(
      getImage(content.featureCards[index], screenWidth, "dark")
    );
    setActiveIndex(index);
  };

  useEffect(() => {
    updateImage(0);
    const triggers: ScrollTrigger[] = content.featureCards.map(
      (_: any, index: number) => {
        return ScrollTrigger.create({
          trigger: cardsRef.current[index] as HTMLElement,
          start: "top center",
          end: "bottom center",
          onEnter: () => updateImage(index),
          onEnterBack: () => updateImage(index),
        });
      }
    );

    return () => {
      triggers.forEach((trigger) => trigger.kill());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenWidth, content.featureCards]);

  return { activeImageLight, activeImageDark, activeIndex, cardsRef };
};

export default useImageAnimation;
