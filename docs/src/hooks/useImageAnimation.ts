"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const useImageAnimation = (content: any, screenWidth: number) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  const updateImage = (index: number) => {
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

  return { activeIndex, cardsRef };
};

export default useImageAnimation;
