<template lang="pug">
section#built-by
  .supported-by
    span Built by
    .logo
  .supported-by-back
    .left
    .right
</template>

<script>
export default {};
</script>

<style lang="stylus" scoped>
.supported-by
  margin-bottom 2rem
  font-size 2rem
  height 5rem
  display flex
  justify-content center
  @media (max-width: 1000px)
    flex-direction column
    height auto

  span
    line-height 5rem
    margin-right 1rem
    @media (max-width: 1000px)
      margin 0
      line-height 1rem
      margin-bottom 16px
      font-size 18px !important
      font-family 'ChivoLight'


#built-by
  padding 12rem 0 10rem
  position relative
  @media (max-width: 1000px)
    padding 0 20px 2rem
    height 568px
    display flex
    flex-direction column
    justify-content center

  span
    color #6E6F70
    text-align center
    font-size 24px
    @media (max-width: 1000px)
      font-size 18px

  .logo
    display inline-block
    background-repeat no-repeat
    background-size contain
    background-position center
    background-image url('../img/logos/NomicLabs-logo.svg')
    width 264px
    height 69px
    margin auto 0
    @media (max-width: 1000px)
      margin 0 auto

  .supported-by-back
    position absolute
    width 100%
    height 100%
    top 0
    left 0
    z-index -1

    .left,
    .right
      background-repeat no-repeat
      display inline-block
      width 50%
      height 100%

    .left
      background-image url('../img/textures/texture-bottom-left.svg')
      background-position bottom left

    .right
      background-position bottom right
      background-image url('../img/textures/texture-bottom-right.svg')
</style>
