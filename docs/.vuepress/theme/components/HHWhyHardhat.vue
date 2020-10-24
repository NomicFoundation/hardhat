<template lang="pug">
section#why-hardhat.padded-container
  .title-wrapper
    h1.section-title
      span Why Hardhat
  section#console-log.section-content
    .columns-container.reverse
      .column.details-column
        .details
          h2 Run Solidity locally
          p Easily deploy your contracts, run tests and debug Solidity code without dealing with live environments. Hardhat Network is a local Ethereum network designed for development.
        .image-container.mb-show
        .details
          h2 Debugging-first
          p Hardhat is the best choice for Solidity debugging. You get Solidity stack traces, console.log and explicit error messages when transactions fail.
      .column.image-column.mb-hidden
        .image-container
    .columns-container
      .column
        HHCta(text="Get started with Solidity console.log", link="/hardhat-network/#console-log")
      .bracket
      .column
  section#extend.section-content
    .columns-container
      .column.image-column.mb-hidden
        .image-container
      .column.details-column
        .details
          h2 Extreme flexibility
          p Change anything you like. Even entire out-of-the-box tasks, or just parts of them. Flexible and customizable design, with little constraints.
        .image-container.mb-show
        .details
          h2 Bring your own tools
          p Designed to make integrations easy, Hardhat allows you to keep using your existing tools while enabling deeper interoperability between them.
    .columns-container
      .column.link-left-space
      .column
        HHCta(text="Learn more about extending Hardhat", link="/guides/create-task.html")
        .bracket.left-bracket
  section#plugins.section-content
    .columns-container.reverse
      .column.details-column
        .details
          h2 Fully extensible
          p A tooling platform designed to be extended, Hardhat has all the utilities you need to address your project-specific needs.
        .image-container.mb-show
        .details
          h2 Plugin ecosystem
          p Extend Hardhat with a composable ecosystem of plugins that add functionality and integrate your existing tools into  a smooth workflow.

      .column.image-column.mb-hidden
        .image-container
    .columns-container
      .column
      .column
        HHCta(text="Get started with plugins", link="/plugins/")
        .bracket
  section#tasks.section-content
    .columns-container
      .column.image-column.mb-hidden
        .image-container
      .column.details-column
        .details
          h2 Fast iteration
          //p A developer’s momentum relies on the development feedback loop, and Hardhat makes sure it’s fast. Run your tests up to 10x faster than using alternative solutions.
          p Keep your momentum going by making your development feedback loop up to 10x faster with Hardhat.

        .image-container.mb-show
        .details
          h2 TypeScript
          p Catch mistakes before you even run your code by switching to a typed language. Hardhat provides full native support for TypeScript.
    .columns-container
      .column.link-left-space
      .column
        HHCta(text="Get started with TypeScript", link="/guides/typescript.html")
        .bracket.left-bracket
  section#vibrant-community.section-content
    .columns-container.reverse
      .column.details-column
        .details
          h2 Vibrant community
          p Great tech attracts great people. Join the Hardhat community to find answers to your problems and contribute to the plugin ecosystem.
          // "Great tech attracts great people. Join the Hardhat community to meet new friends and expand the plug-in ecosystem”
          HHCta(
            text="Join the Hardhat Discord",
            link="/discord",
            external
          )

      .column
        .image-container
</template>

<script>
import HHCta from "./HHCta";

export default {
  name: "HHWhyHardhat",
  components: { HHCta },
};
</script>

<style lang="stylus" scoped>
@import "../styles/util/variables.styl"

.title-wrapper
  margin-bottom 6rem
  position relative
  @media (max-width: 1000px)
    margin-bottom 4rem

  &:after
    position absolute
    top 50%
    content ''
    height 18px
    width 100%
    left 0
    z-index -1
    border-top 1px solid lightgray
    border-left 1px solid lightgray
    border-right 1px solid lightgray

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
    height 18px
    width 100%
    content ''
    left 0
    bottom 28px
    position absolute
    transform translateY(0.6rem)
    z-index -1
    border-right 1px solid lightgray
    border-bottom 1px solid lightgray

  .bracket.left-bracket
    @media screen and (min-width: 1000px)
      border-right none
      border-left 1px solid lightgray

#why-hardhat
  @media screen and (max-width: 1000px)
    padding 1rem 20px 0

  .section-title
    color #0A0A0A
    font-size 24px

    span
      font-family 'Chivo' !important
    @media screen and (max-width: 1000px)
      font-size 20px

  .section-content
    margin-bottom 8rem
    @media (max-width: 1000px)
      margin-bottom 6rem

    .columns-container
      display flex

      &:first-child
        margin-bottom 40px
      @media (max-width: 1000px)
        flex-direction column
        margin-bottom 0 !important

      &.reverse
        @media (max-width 1000px)
          flex-direction column-reverse

      .column.details-column
        width 45%

      .column.image-column
        width 55%
        position relative
        @media (max-width 1000px)
          height 20rem
          margin-bottom 30px

      .column.link-left-space
        width 55%

      .column.half
        width 50%

      .column
        @media (max-width 1000px)
          width 100% !important

    .details
      &:first-child
        margin-bottom 64px
        @media (max-width 1000px)
          margin-bottom 0
          p
            margin-bottom 0

      h2
        margin-bottom 24px
        font-family 'ChivoLight'
        font-size 42px
        font-weight 100
        @media (max-width 1000px)
          font-size 28px
          margin-bottom 16px
        @media (min-width: 1000px) and (max-width: 1040px)
          font-size 38px

      p
        font-size 18px
        line-height 28px
        color #6E6F70
        font-family 'ChivoLight'
        margin-bottom 48px

    .cta-link // This style adds the white-space next to the button
      position relative

      &:after, &:before
        content ''
        position absolute
        top 0
        height 100%
        width 10px
        background white

      &:before
        left 100%

      &:after
        right 100%

    .cta-container.pull-left
      a
        margin-left 50%

  .image-container
    position absolute
    background-size contain
    @media screen and (max-width: 1000px)
      position relative
      left unset
      top unset
      right unset
      background-size contain !important
      width 100%
      margin 34px 0

#console-log
  .image-container
    width 605px
    height 542px
    background-image url('../img/graphics/Graphic-1@2x.png')
    left 30px
    bottom 30px
    transform-origin left center
    @media (max-width: 1000px)
      height 300px !important
      bottom 0 !important
    @media (min-width: 1000px) and (max-width: 1040px)
      transform scale(.9)

#extend
  .image-container
    width 505px
    height 500px
    background-image url('../img/graphics/Graphic-2@2x.png')
    bottom -65px
    right 30px
    transform-origin bottom right
    @media (max-width: 1000px)
      bottom 0 !important
      position relative
      height 300px !important

#plugins
  .image-container
    width 522px
    height 565px
    background-image url('../img/graphics/Graphic-3@2x.png')
    transform translateY(-30px)
    transform-origin left center
    left 30px
    @media (max-width: 1000px)
      position relative
      top 0
      height 340px !important
      background-size 80%
      transform none

#tasks
  .image-container
    position absolute
    right 50px
    width 712px
    height 446px
    background-image url('../img/graphics/Graphic-4@2x.png')
    transform-origin right center
    bottom 0
    top 74px
    @media (min-width: 1000px) and (max-width: 1100px)
      right 10px
      transform translateY(20px)
    @media (max-width: 999px)
      position relative
      top 0
      height 260px !important
      transform translateX(-40px)
    @media (max-width: 458px)
      right 20px
      height 220px !important
      transform-origin center
      transform scale(1.2) translateX(-40px)

// top 95px
#vibrant-community
  position relative
  margin-top 15rem
  margin-bottom 0 !important
  @media (max-width: 1000px)
    margin-top 5rem
    margin-bottom 0rem !important

  .column:first-child
    padding 3rem 2rem 0rem 0
    @media screen and (max-width: 1000px)
      padding 0 5px

  .details-column
    width 40%

  .column
    width 50% !important
    position relative

    .details
      border none !important
      @media screen and (max-width: 1000px)
        text-align center
        font-size 20px

      h2
        text-transform uppercase
        letter-spacing 4px
        color #0A0A0A
        font-family 'Chivo'
        font-weight 100
        font-size 20px !important

      p
        font-size 18px
        line-height 28px
        @media screen and (max-width: 1000px)
          padding 0 15px
          margin 20px 0 !important

      a
        margin-top 2rem
        background white
        color $black
        border 0.1rem solid lightgray
        transition 0.1s ease-in-out all
        @media (max-width: 1000px)
          margin-top 0rem
          margin-bottom 60px

        &:hover
          // box-shadow 0 0 5px alpha(black, 0.1)
          background alpha(#4F00A3, 0.05)
          border-color transparent
          color #0A0A0A

        &:after, &:before
          display none

  .image-container
    width 530px
    height 365px
    background-image url('../img/graphics/Vibrant_community@2x.png')
    background-size contain
    background-repeat no-repeat
    background-position center
    background-blend-mode multiply
    transform-origin bottom center
    transform translateY(-20px)
    @media (max-width: 1000px)
      margin 0 auto
      bottom 10px
    @media (max-width: 660px)
      width 400px !important
      background-size contain !important
      height 260px
      bottom 50px
      transform translateX(-30px)

  &:before
    position absolute
    width calc(100% + 20rem)
    height 450px
    content ''
    top -50px
    left -10rem
    box-shadow 0 0 5rem alpha($black, 0.08)
    pointer-events none
    @media (max-width: 1000px)
      width 100%
      height calc(100%)
      left 0
      top -20px
</style>
