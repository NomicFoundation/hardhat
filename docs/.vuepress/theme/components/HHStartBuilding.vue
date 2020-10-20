<template lang="pug">
section#start-building
  .background
    .sb-graphic.background-texture-mb.mb-show
    .sb-graphic.left-graphic.mb-hidden
    .sb-graphic.right-graphic.mb-hidden
  .cta-container
    h2 Hardhat is next-generation Ethereum tooling
    p Experience the new way of building Ethereum software
    HHCta(text="Get started", link="/getting-started/")
</template>

<script>
import HHCta from "./HHCta";

export default {
  name: "HHStartBuilding",
  components: {
    HHCta,
  },
};
</script>

<style lang="stylus" scoped>

#start-building
  position relative
  overflow hidden
  justify-content center
  max-height 810px
  height 100%
  width 100vw
  min-height 615px
  display flex
  flex-direction column
  @media (max-width: 1000px)
    height 615px
  @media (min-width: 1000px)
    min-height 51vw

  .background
    position absolute
    z-index -1
    width 100%
    height 100%
    background-image url('../img/textures/CTA-background-gradient.svg')
    background-position center
    background-repeat no-repeat
    background-size cover
    @media (max-width: 580px)
      background-image url('../img/textures/CTA-Background-gradient-mobile.svg')
    @media (min-width: 1900px)
      background-image url('../img/textures/CTA-background-gradient-1920.svg')

    .sb-graphic
      width inherit
      height inherit
      position inherit
      background-repeat no-repeat

      &.background-texture-mb
        background-image url('../img/textures/mobile_texture_bricks.svg')
        background-position center
        position relative
        right -32vw

      &.left-graphic
        background-image url('../img/textures/Texture_bricks-L.svg')
        z-index 100
        top 0
        width 835px
        height 863px
        left -100px
        background-position left center

      &.right-graphic
        top 0
        width 835px
        height 863px
        background-image url('../img/textures/Texture_bricks-R.svg')
        z-index 100
        right 0
        // transform rotate(180deg)
        background-position right center
        opacity .5

  .cta-container
    display flex
    flex-direction column
    text-align center
    justify-content center
    align-items center

    h2
      font-size 45px
      margin-bottom 24px
      font-family 'ChivoBold'
      width 700px
      font-weight 100
      @media screen and (max-width: 1000px)
        font-size 28px
        width 80%
        max-width 513px
        padding 0 20px

    p
      font-size 24px
      line-height 40px
      margin-bottom 48px
      padding 0 20px
      @media screen and (max-width: 1000px)
        font-size 20px
        line-height 31px
        margin-bottom 50px
        max-width 513px

    .cta-link
      padding 20px 30px
</style>
