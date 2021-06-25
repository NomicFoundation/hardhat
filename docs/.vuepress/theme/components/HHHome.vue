<template lang="pug">
  div
    main
      HHTools
      HHWhyHardhat
      HHStartBuilding
      HHWhosUsingHardhat
      HHTestimonials
      HHBuiltBy
</template>

<script>
  import HHTools from "./HHTools";
  import HHWhyHardhat from "./HHWhyHardhat";
  import HHStartBuilding from "./HHStartBuilding";
  import HHWhosUsingHardhat from "./HHWhosUsingHardhat";
  import HHTestimonials from "./HHTestimonials";
  import HHBuiltBy from "./HHBuiltBy";

  export default {
    name: "HHHome",
    components: {
      HHWhyHardhat,
      HHStartBuilding,
      HHWhosUsingHardhat,
      HHTestimonials,
      HHBuiltBy,
      HHTools
    },
  };
</script>

<style lang="stylus">
  main
    position relative
    z-index 99
    .title-wrapper
        margin-bottom 72px
        position relative
        @media (max-width: 1000px)
            margin-bottom 4rem
        &:after
            position absolute
            top 50%
            content ''
            height 36px
            width 100%
            left 0
            z-index -1
            border-top 1px  solid #C4C4C4
            border-left 1px  solid #C4C4C4
            border-right 1px solid #C4C4C4
        .section-title
            width fit-content
            padding 1rem 2rem
            margin 0 auto
            background white
            font-size 1.6rem
            font-family 'ChivoBold'
            color #F5DA0C
            text-align center
            z-index 1
            letter-spacing 6px
            text-transform uppercase
            &.yellow-background
                span
                    font-family 'ChivoBold'
                    background: -webkit-linear-gradient(360deg, #FFF04D, #F5DA0C);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
    .image-container
        background-repeat no-repeat
        background-position center
        @media screen and (max-width: 1000px)
            width 100% !important
            left 0% !important
            max-height 60vh
    .columns-container
        width 100%
        position relative 
        .bracket
            height 36px
            width 100%
            content ''
            left 0
            bottom 28px
            position absolute
            transform translateY(0.6rem)
            z-index -1
            border-right 1px solid #C4C4C4
            border-bottom 1px solid #C4C4C4
            display none
        .bracket.left-bracket
            @media screen and (min-width: 1000px)
                border-right none
                border-left 1px solid #C4C4C4
</style>
