<template lang="pug">
  section#testimonials
    .padded-container
      component(
          v-if="VueCarousel",
          :is="VueCarousel.Carousel"
          :loop="true"
          :scrollPerPage="false"
          :perPage="1"
          :navigationEnabled="true"
          :paginationEnabled="false"
          :navigationPrevLabel="'<img src=\"' + CarrouselArrowImage + '\" />'"
          :navigationNextLabel="'<img src=\"' + CarrouselArrowImage + '\" />'"
          :navigationClickTargetSize="0"
      ).testimonial-slider
        component(
          :is="VueCarousel.Slide"
          v-for="testimonial of testimonials"
        ).testimonial
            .user-column
              .user-picture(
                :style="{backgroundImage: 'url(\"' + testimonial.avatar_url + '\")'}"
              )
              .user-details-wrapper
                .user-name
                  span {{testimonial.name}} 
                  br.mb-show
                  span {{testimonial.position}}  at  {{testimonial.company}}
                img(:src="testimonial.logo_url")
            .comment-column
              p "{{testimonial.comment}}"
</template>

<script>
import KyberAvatarImage from "../img/testimonials/testimonial-victor_tran.png";
import KyberLogoImage from "../img/company_logos/svg/logo-kyber.svg";

import SynthetixAvatarImage from "../img/testimonials/justin.jpg";
import SynthetixLogoImage from "../img/company_logos/svg/logo-synthetix.svg";

import AragonAvatarImage from "../img/testimonials/brett.jpg";
import AragonLogoImage from "../img/company_logos/svg/logo-aone.svg";

import ConnextAvatarImage from "../img/testimonials/rahul.jpg";
import ConnextLogoImage from "../img/company_logos/svg/logo-connext.svg";

import DecentralandAvatarImage from "../img/testimonials/esteban.png";
import DecentralandLogoImage from "../img/company_logos/svg/logo-decentraland.svg";

import CarrouselArrowImage from "../img/assets/carrousel_arrow.svg";

export default {
  name: "HHTestimonials",
  data() {
    return {
      VueCarousel: null,
      CarrouselArrowImage,
      testimonials: [
        {
          name: "Victor Tran",
          position: "CTO",
          company: "Kyber",
          logo_url: KyberLogoImage,
          avatar_url: KyberAvatarImage,
          comment:
            "Working with Hardhat has been a great experience. Thanks to its flexibility we were able to test across different Solidity versions without duplicating our setup. Kyber has been around for long enough to have legacy contracts deployed with different Solidity versions in our architecture, so this kind of flexibility is important for such a mature project. The collaboration between the Kyber and Hardhat teams to fix issues and implement new features has been fast and smooth, which helped our internal timelines a lot.",
        },
        {
          name: "Justin J. Moses",
          position: "CTO",
          company: "SYNTHETIX",
          logo_url: SynthetixLogoImage,
          avatar_url: SynthetixAvatarImage,
          comment:
            "Tired of battling other testing frameworks, I tried Hardhat on a whim one afternoon to see just how hard it might be to port Synthetix over to it. After fifteen minutes I had one of our specs running nearly 10x faster that what I’d become used to; from that moment I was hooked. Since then, we’ve integrated coverage, supported multiple versions of solc and even set up legacy testing through injection - all without having to wait for features to be added by the Hardhat team. It’s been built using its own extensible task system, dogfooding its own plugin architecture. Fast test turnarounds, extensible architecture and solidity stack traces - my dream of smart contract TDD has become a lot more real!",
        },
        {
          name: "Brett Sun",
          position: "CTO",
          company: "Aragon One",
          logo_url: AragonLogoImage,
          avatar_url: AragonAvatarImage,
          comment:
            "Our interest in Hardhat was driven by our own experience of building and maintaining developer tooling for the Aragon ecosystem. Not only were these efforts time consuming, difficult, and error-prone, we also found ourselves constantly re-inventing the wheel in areas we did not want to care about or force opinions on (e.g. Ganache connections, Truffle providers, test strategy). Hardhat, with its plugin ecosystem, has effectively eliminated many of these problems for us. We feel confident piggybacking on the best for the underlying layers so that we can focus our attention on exposing the power of the Aragon ecosystem to our community.",
        },
        {
          name: "Rahul Sethuram",
          position: "CTO",
          company: "Connext Network",
          logo_url: ConnextLogoImage,
          avatar_url: ConnextAvatarImage,
          comment:
            "Builder has become an essential part of our development and Continuous Integration stack. At Connext, we develop and test complicated smart contract systems for our state channel implementations, making proper Solidity tooling a key to our productivity and success. Hardhat's state-of-the-art Solidity stack trace and console.log features saved us considerable development time. As a user, it's clear that Hardhat prioritizes a great developer experience, which aligns fully with Connext's values. We enjoy interacting with the team and we have even made contributions to the project.",
        },
        {
          name: "Esteban Ordano",
          position: "CTO",
          company: "Decentraland",
          logo_url: DecentralandLogoImage,
          avatar_url: DecentralandAvatarImage,
          comment:
            "Hardhat's extensibility, clean interface and excellent design is the most significant advancement in the professionalization of tools for Ethereum of the past year. Our development experience improved significantly, and the quality of the development process is reflected in the fact that our team went from fearing updating packages to the latest version to watching out for the next release.",
        },
      ],
    };
  },
  mounted() {
    import("vue-carousel").then((module) => {
      this.VueCarousel = module;
    });
  },
};
</script>

<style lang="stylus">

// This is not scoped because we want to style VueCarousel's navigation buttons

@import "../styles/util/variables.styl";

#testimonials
  margin-top 60px


  .padded-container
    position relative
    padding 0

    &:after,
    &:before
      content ''
      border 0.1rem solid #D4D4D4
      width 5rem
      position absolute
      top 0
      min-height $carousel-height
      @media (max-width: 1000px)
        display none
        min-height $carousel-height-mb

    &:after
      left 0
      border-right none

    &:before
      right 0
      border-left none

  .VueCarousel-navigation-button
    width 3rem
    height 3rem
    background white
    border none
    box-shadow 0 2px 6px lightgray
    border-radius 100px
    position absolute
    top calc(50% - 3rem)
    cursor pointer
    transition 0.2s ease-in-out all
    transform translateY(0px)

    &:hover
      transform translateY(-5px)
      box-shadow 0 8px 20px alpha(lightgray, .5)

    @media (max-width: 1000px)
      top 40px
      transform scale(.7)

    &.VueCarousel-navigation-prev
      left -5rem
      @media (max-width: 1000px)
        left 5px
      @media (min-width: 1000px) and (max-width: 1040px)
        left -66px

    &.VueCarousel-navigation-next
      right -5rem
      @media (max-width: 1000px)
        right 5px
      @media (min-width: 1000px) and (max-width: 1040px)
        right -66px

      img
        transform rotate(180deg)

    &:focus
      outline none

    &:active
      background whitesmoke

  .testimonial-slider
    height fit-content
    min-height $carousel-height
    @media (max-width: 1000px)
      min-height $carousel-height-mb

    .testimonial
      @media (max-width: 1000px)
        height 520px
      @media (max-width: 670px)
        height 680px
      position relative
      padding 2.5rem
      height $carousel-height
      @media (max-width: 1000px)
        padding 0
        height $carousel-height-mb

      &:focus
        outline 0

  .testimonial
    display flex
    @media (max-width: 1000px)
      flex-direction column

    .user-column
      width 30%
      display flex
      flex-direction column
      justify-content center
      padding 2rem 1rem 0
      @media (max-width: 1000px)
        width 100%
        flex-direction row
        padding 0

      .user-picture
        width 150px
        height 150px
        background-size cover
        background-position center
        background-repeat no-repeat
        margin 0 auto 1rem
        border-radius 100px
        @media (max-width: 1000px)
          margin 0
          width 110px
          height 110px

      .user-details-wrapper
        @media (max-width: 1000px)
          margin-left 1rem
          display flex
          flex-direction column
          justify-content center

        .user-name
          text-align center
          font-size 15px
          color #6E6F70
          font-family 'ChivoBold'
          font-weight 100
          line-height 24px
          @media (max-width: 1000px)
            text-align left
            margin-bottom 10px

        img
          display block
          margin 20px auto
          max-height 40px
          max-width 100px
          @media (max-width: 1000px)
            margin 5px 0

    .comment-column
      width 70%
      padding 1.5rem
      display flex
      flex-direction column
      justify-content center
      @media (max-width: 1000px)
        width 100%
        padding 0 40px
        margin-top 20px

      p
        color #6e6f70
        line-height 28px
        font-size 15px
        font-family 'ChivoLight'
</style>
