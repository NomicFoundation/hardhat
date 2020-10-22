<template lang="pug">
  .migration-modal
    .modal-content
      .close(@click="close") &times;

      .desktop-version
        .content
          .title Buidler is <br/>now Hardhat

          .message
            a(:href="postUrl" target="_blank" rel="noopener noreferrer") Read the announcement
            span  to learn more 
            br
            span about the latest release and rebrand.

        img(:src="LogoImg").logo

      .mobile-version
        img(:src="LogoImg").logo

        .content
          .title Buidler is <br /> now Hardhat 

          .message
            a(:href="postUrl" target="_blank" rel="noopener noreferrer") Read the announcement
            span=" to learn more about the latest release and rebrand."

</template>

<script>
const MODAL_OPENED_KEY = "__has_hardhat_modal_been_opened__";

import LogoImg from "../img/hardhat_logos/Hardhat-logo_vertical-shadow.svg";

export default {
  name: "HHMigrationModal",

  data() {
    return {
      LogoImg,
      postUrl:
        "https://medium.com/nomic-labs-blog/buidler-has-evolved-introducing-hardhat-4bccd13bc931",
    };
  },

  methods: {
    open() {
      this.$el.style.display = "block";
    },

    close() {
      this.$el.style.display = "none";
      this.setAsOpened();
    },

    onClick(event) {
      if (event.target === this.$el) {
        this.close();
      }
    },

    hasBeenOpened() {
      if (typeof window === "undefined") {
        return true;
      }

      return window.localStorage.getItem(MODAL_OPENED_KEY) !== null;
    },

    setAsOpened() {
      window.localStorage.setItem(MODAL_OPENED_KEY, "yes");
    },
  },

  mounted() {
    if (this.hasBeenOpened()) {
      return;
    }

    this.open();
    window.onclick = this.onClick;
  },

  destroyed() {
    if (window.onclick === this.onClick) {
      window.onclick = null;
    }
  },
};
</script>

<style lang="stylus" scoped>
@import "../styles/util/variables.styl"

.migration-modal
  display none
  position fixed
  z-index 10000
  left 0
  top 0
  width 100%
  height 100%
  overflow auto
  background-color #292C32
  background-color alpha(#292C32, 0.9)

  .modal-content
    padding 20px
    background linear-gradient(180deg, #F6F1FD 0%, #FBFCDB 100%)
    box-sizing border-box

    width 700px
    height 400px

    position relative
    top: 50%
    left 50%
    transform: translate(-50%, -50%);


    @media (max-width 760px)
      width 85%
      height fit-content


    @media (max-width 760px)
      .mobile-version
        display block

      .desktop-version
        display none

    @media (min-width 760px)
      .mobile-version
        display none

      .desktop-version
        display block


    .desktop-version
      .content
        position absolute
        transform translateY(-50%)
        height fit-content
        color $black
        top 50%
        left 90px

        .title
          font-family: 'ChivoBold', sans-serif
          font-size 50px
          line-height 60px

        .message
          font-size 18px
          line-height 28px
          margin-top 18px
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;

          a
            font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
            font-weight normal
            text-decoration underline

      .logo
        position absolute
        right 90px
        width 140px
        top 50%
        transform translateY(-50%)

    .mobile-version
      text-align center
      padding 3rem 0

      .content
        color $black

        .title
          font-family: 'ChivoBold'
          font-size 2rem
          line-height 1.15em

        .message
          font-size 1.25rem
          padding 1rem 0 0
          line-height 1.5em

          a
            font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
            text-decoration underline

      .logo
        width 50%


    .close
      color #aaa
      position absolute
      top 0.5rem
      right 0.5rem
      line-height 20px
      font-size 35px
      font-weight bold

    .close:hover,
    .close:focus
      color black
      text-decoration none
      cursor pointer
</style>
