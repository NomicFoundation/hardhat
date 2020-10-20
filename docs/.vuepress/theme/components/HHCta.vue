<template lang="pug">
a.cta-link.secondary(
  :href="link",
  :to="link",
  :target="external ? '_blank' : ''",
  :rel="external ? 'noopener noreferrer' : ''"
)
  .inner-mask-container
    .inner-mask
  span {{ text }}
</template>

<script>
export default {
  props: {
    text: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      required: true,
    },
    external: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style lang="stylus" scoped>
.cta-link
  background linear-gradient(256.6deg, #FFF100 0%, #FFF100 100%)
  display inline-block
  padding 13px 20px
  color $black
  border-radius 4px
  font-family 'Chivo'
  transition .2s ease-in-out all
  font-size 15px
  @media screen and (max-width 1000px)
    padding 13px 10px
    white-space nowrap
    font-size 14px

  span
    font inherit
    position relative
    z-index 100
    pointer-events none

  &.secondary
    color #0A0A0A
    position relative

    .inner-mask-container
      overflow hidden
      position absolute
      top 0
      left 0
      width 100%
      height 100%

      &:hover
        .inner-mask
          width 500px
          height 500px
          top -100px
          left -100px

      .inner-mask
        background alpha(white, .4)
        width 10px
        height 10px
        border-radius 100px
        display inline-block
        position absolute
        left 20px
        top 20px
        transition 0.3s ease-in-out all
        filter blur(3px)
</style>
