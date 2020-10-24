<template lang="pug">
header
  section.hero.padded-container
    .hero-text-wrapper
      section.hero-text-container
        span.top-hero-text Flexible. Extensible. Fast.
        h1.hero-title Ethereum development environment for professionals

        HHCta.mb-hidden(text="Get started", link="/getting-started/")

    ClientOnly
      component(v-if="HHAnimation", :is="HHAnimation")

    .hero-cta-link.mb-show
      HHCta.mb-show(text="Get started", link="/getting-started/")
</template>

<script>
import HHCta from "./HHCta";

// We preload these images as soon as this component is laoded
import CachedBmp from "../img/animated_hero/CachedBmp_9.png";
import HardhatHeroAtlas1 from "../img/animated_hero/Harhdat_hero_atlas_1.png";
import HardhatHeroAtlas2 from "../img/animated_hero/Harhdat_hero_atlas_2.png";

preloadImage(CachedBmp);
preloadImage(HardhatHeroAtlas1);
preloadImage(HardhatHeroAtlas2);

export default {
  name: "HHHero",
  components: { HHCta },
  data() {
    return { HHAnimation: null };
  },
  mounted() {
    import("./HHAnimation").then((module) => {
      this.HHAnimation = module.default;
    });
  },
};

function preloadImage(url) {
  if (typeof window === "undefined") {
    return;
  }

  if (window.__preloadedImages === undefined) {
    window.__preloadedImages = [];
  }

  const image = new Image();
  image.src = url;

  window.__preloadedImages.push(image);
}
</script>

<style lang="stylus" scoped>
header
  height 85vh
  display flex
  flex-direction column
  min-height 560px
  max-height 960px
  @media screen and (max-width 1000px)
    margin-bottom 60px
    max-height 70vh
    min-height 640px
  @media (max-width: 660px)
    max-height 620px
    margin-bottom 0
  @media (min-width: 661px) and (max-width 999px)
    height 60vh
    max-height 600px
  @media (min-width: 1000px) and (max-width: 1040px)
    height 70vh
    max-height 800px

.hero
  padding 0
  position relative
  display flex
  width 100%
  flex-grow 1
  min-height 500px
  max-height 1080px
  @media (max-width: 1000px)
    padding 0 20px
    flex-direction column
    justify-content space-between
    max-height calc(100vh - 150px)
    transform scale(1)
    max-height 60vh
  @media (max-width: 740px)
    max-height 620px
  @media (min-width: 1000px) and (max-width: 1040px)
    max-height 1020px

  .hero-text-wrapper
    // height calc(100vh - 10rem)
    display flex
    flex-direction column
    justify-content center
    @media (max-width: 1000px)
      display block
      width 100%
      height auto

    .hero-text-container
      display inline-block
      max-width 45rem
      @media screen and (max-width 1000px)
        text-align center
        margin 0 auto
        display block

      .top-hero-text
        margin-bottom 1.5rem
        display block
        font-size 32px
        color #0A0A0A
        @media (max-width: 1000px)
          font-size 18px
          margin-bottom 12px
          margin-top 30px
        @media (max-width: 670px)
          margin-bottom 16px

      .hero-title
        line-height 72px
        font-family 'ChivoBold'
        font-size 72px
        margin-bottom 5rem
        font-weight 100
        @media (max-width: 1000px)
          font-size 39px
          line-height 42px
          margin-bottom 0

  .cta-link
    padding 20px
    @media (max-width: 1000px)
      &:after
        content ''
        position absolute
        width 200%
        height 200%
        bottom 30px
        z-index -1
        background linear-gradient(180deg, alpha(white, 0), white)

  .hero-cta-link
    position relative
    margin 0 auto 20px
</style>
