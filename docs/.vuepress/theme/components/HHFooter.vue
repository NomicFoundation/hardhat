<template lang="pug">
footer
  section.padded-container
    .supported-by
      span Supported by
      .logo
    .separator
      
    .legal
      a Copyright 2020 Nomic Labs LLC | 
      a(href="/privacy-policy.html") Privacy Policy
</template>

<script>
export default {};
</script>

<style lang="stylus" scoped>
footer
  background $hh-yellow
  text-align center
  padding 3rem 0
  font-size 1rem
  background #0A0A0A

  .supported-by
    margin-bottom 2rem
    font-size 2rem
    height 5rem
    display flex
    justify-content center
    @media (max-width: 1000px)
      flex-direction column
      height auto

    .logo
      display inline-block
      width 12rem
      height 5rem
      background-repeat no-repeat
      background-size contain
      background-position center
      background-image url('../img/logos/Logo-EthereumFoundation.svg')
      @media (max-width: 1000px)
        margin 0 auto

    span
      line-height 5rem
      margin-right 1rem
      @media (max-width: 1000px)
        margin 0
        line-height 1rem
        margin-bottom 16px
        font-size 18px !important
        font-family 'ChivoLight'
      font-size 24px
      color #F2F2F2
    @media (max-width: 1000px)
      margin 40px 0 70px

  .disclaimer
    line-height 24px
    max-width 700px
    margin auto
    font-size 15px
    color #9B9FA8
    font-family 'Chivo'
    margin-top 40px
    @media (max-width: 1000px)
      font-size 12px

    a
      text-decoration underline
      font-family inherit
      color inherit

  .separator
    width 185px
    height 1px
    background #4B4D4D
    margin 24px auto

  .legal
    font-size 15px
    color #9B9FA8
    font-family 'Chivo'
    @media (max-width: 1000px)
      margin-bottom 40px
      font-size 12px
    
    a
      font-family inherit
      color inherit 

  *
    color black
</style>
