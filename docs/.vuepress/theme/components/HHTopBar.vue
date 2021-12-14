<template lang="pug">
section.top-bar
  a(
    href="https://www.notion.so/nomiclabs/Nomic-Labs-jobs-991b37c547554f75b89a95f437fd5056",
    target="_blank",
    rel="noopener noreferrer"
  )
    .top-bar-content.desktop-top-bar
      span
        span.colored.reverse.animation-6chars.animation-reversed
          span <
          span <
          span <
          span <
          span <
          span <
            |
            |
        span.top-text
          a(:href="postUrl" class="top-bar-link" target="_blank" rel="noopener noreferrer") Join the Hardhat team! Nomic Labs is #{' '}
            span hiring
        span.colored.reverse.animation-6chars
          span
            |
            | >
          span >
          span >
          span >
          span >
          span >
    .top-bar-content.mobile-top-bar
      span
        span.colored.reverse.animation-4chars.animation-reversed
          span <
          span <
          span <
          span <
            |
            |
        span.top-text
          a(:href="postUrl" class="top-bar-link" target="_blank" rel="noopener noreferrer") Join the Hardhat team! We are #{' '}
            span hiring
        span.colored.reverse.animation-4chars
          span
            |
            | >
          span >
          span >
          span >
</template>

<script>
export default {
  name: "HHTopBar",
  data() {
    return {
      postUrl:
        "https://www.notion.so/nomiclabs/Nomic-Labs-jobs-991b37c547554f75b89a95f437fd5056",
    };
  },
};
</script>

<style lang="stylus" scoped>

@import "../styles/util/variables.styl"
@import "../styles/fonts.styl"

.animation-6chars
  span
    animation-duration 1.75s
    animation-iteration-count 3

    &:nth-child(1)
      animation-name char1of6
    &:nth-child(2)
      animation-name char2of6
    &:nth-child(3)
      animation-name char3of6
    &:nth-child(4)
      animation-name char4of6
    &:nth-child(5)
      animation-name char5of6
    &:nth-child(6)
      animation-name char6of6

.animation-6chars.animation-reversed
  span
    &:nth-child(6)
      animation-name char1of6
    &:nth-child(5)
      animation-name char2of6
    &:nth-child(4)
      animation-name char3of6
    &:nth-child(3)
      animation-name char4of6
    &:nth-child(2)
      animation-name char5of6
    &:nth-child(1)
      animation-name char6of6


.animation-4chars
  span
    animation-duration 1.75s
    animation-iteration-count 3

    &:nth-child(1)
      animation-name char1of4
    &:nth-child(2)
      animation-name char2of4
    &:nth-child(3)
      animation-name char3of4
    &:nth-child(4)
      animation-name char4of4

.animation-4chars.animation-reversed
  span
    &:nth-child(4)
      animation-name char1of4
    &:nth-child(3)
      animation-name char2of4
    &:nth-child(2)
      animation-name char3of4
    &:nth-child(1)
      animation-name char4of4

.top-bar
  margin 0
  padding 0
  box-sizing border-box
  font-family: 'ChivoLight', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif !important;
  color $black

  *
    -webkit-font-smoothing antialiased  !important
    -moz-osx-font-smoothing grayscale !important
    font-weight 600
    margin 0
    padding 0
    box-sizing border-box
    font-family: 'ChivoLight', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
    color $black

  background-color #0A0A0A
  text-align center
  font-weight 200
  padding 0.8rem;
  vertical-align center
  height 48px
  @media screen and (max-width 1000px)
    padding 0.8rem 0
    white-space nowrap

  a
    display block

  span
    font-family 'ChivoLight'
    color $hh-yellow
    display inline

    &.colored
      color $hh-yellow
      font-family inherit

    .top-text
      color white
      font-size 15px !important
      @media screen and (max-width 1000px)
        font-size 13px !important

  .top-bar-link
    text-decoration none
    font-family 'Chivo'
    color white
    font-weight normal
    display inline-block

    span
      color white
      text-decoration underline

  .top-bar-content
    line-height 24px

  .desktop-top-bar
    @media screen and (max-width: 600px)
      display none

  .mobile-top-bar
    @media screen and (min-width: 599px)
      display none

@keyframes char1of6 {
  0% {opacity: 0; }
  16.6% {opacity: 1; }
  33.3% {opacity: 1; }
  50% {opacity: 1; }
  66.6% {opacity: 1; }
  83.3% {opacity: 1; }
}


@keyframes char2of6 {
  0% {opacity: 1; }
  16.6% {opacity: 0; }
  33.3% {opacity: 1; }
  50% {opacity: 1; }
  66.6% {opacity: 1; }
  83.3% {opacity: 1; }
}


@keyframes char3of6 {
  0% {opacity: 1; }
  16.6% {opacity: 1; }
  33.3% {opacity: 0; }
  50% {opacity: 1; }
  66.6% {opacity: 1; }
  83.3% {opacity: 1; }
}

@keyframes char4of6 {
  0% {opacity: 1; }
  16.6% {opacity: 1; }
  33.3% {opacity: 1; }
  50% {opacity: 0; }
  66.6% {opacity: 1; }
  83.3% {opacity: 1; }
}

@keyframes char5of6 {
  0% {opacity: 1; }
  16.6% {opacity: 1; }
  33.3% {opacity: 1; }
  50% {opacity: 1; }
  66.6% {opacity: 0; }
  83.3% {opacity: 1; }
}

@keyframes char6of6 {
  0% {opacity: 1; }
  16.6% {opacity: 1; }
  33.3% {opacity: 1; }
  50% {opacity: 1; }
  66.6% {opacity: 1; }
  83.3% {opacity: 0; }
  100% {opacity: 1; }
}

@keyframes char1of4 {
  0% {opacity: 0; }
  25% {opacity: 1; }
  50% {opacity: 1; }
  75% {opacity: 1; }
  100% {opacity: 0; }
}

@keyframes char2of4 {
  0% {opacity: 1; }
  25% {opacity: 0; }
  50% {opacity: 1; }
  75% {opacity: 1; }
  100% {opacity: 1; }
}

@keyframes char3of4 {
  0% {opacity: 1; }
  25% {opacity: 1; }
  50% {opacity: 0; }
  75% {opacity: 1; }
  100% {opacity: 1; }
}

@keyframes char4of4 {
  0% {opacity: 1; }
  25% {opacity: 1; }
  50% {opacity: 1; }
  75% {opacity: 0; }
  100% {opacity: 1; }
}
</style>
