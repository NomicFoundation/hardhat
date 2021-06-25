<template lang="pug">
#mobile-hero-image-wrapper.hero-image-wrapper(ref="mobileImageWrapper")
  .hero-frame
    #mobile_animation_container(ref="mobileAnimationContainer")
      canvas#mobile_canvas(ref="mobile_canvas", width="407px", height="216px")
      #mobile_dom_overlay_container
    #ethereum-bg(ref="ethereumBg")
</template>

<script>
// This import deserves an explanation.
//   - It's a webpack-specific imports, which uses some special webpack
//     loaders to make an incompatible file work with it. These loaders
//     could be initialized in vuepress' config.js, but doing here
//     encapsulates its complexity.
//   - First, it uses webpack's imports-loader to wrap the module
//     being imported in a IIFE, using window as this, which is needed
//     because createjs initializes itself into `this`.
//   - Then, we use exports-loader to define a commonjs style export of
//      window.createjs, so that we can import it here. i.e. it adds
//      `module.exports = window.createjs` to the module.
//   - Finally, as createjs's package.json#main points to a non-existent file
//     we import one that is placed inside its builds directory.
import createjs from "imports-loader?wrapper=window!exports-loader?type=commonjs&exports=single window.createjs!createjs/builds/1.0.0/createjs.js";

// Instead of using a special import, we modified this file manually. The main
// reason to do that, is that we want the assets' URLs to also be managed by
// Webpack, and that's requires a code replacement that's not trivial with a
// loader.
import "../img/animated_hero_mobile/Hardhat-mobile_HTML5 Canvas.js";

// This is a pretty modified version of the bootstrap script that adobe animate
// outputs. The reason we modified it is that we want the animation to start
// loading as soon as possible, whether it has to be rendered yet or not.
//
// We do so by starting its loading process when this component is imported,
// and not necessarily mounter.
//
// We store a promise to its `complete` loading event, and then use it when
// the component is mounted to make sure that we can already start it.
//
// Finally, as this is a SPA, we properly remove all the listeners the animation
// sets, or it will leak as our users navigate the site.

export default {
  name: "HHMobileAnimation",
  mounted() {
    let mobile_canvas = document.getElementById("mobile_canvas");
    let mobile_anim_container = document.getElementById("mobile_animation_container");
    let mobile_dom_overlay_container = document.getElementById("mobile_dom_overlay_container");
    let fnStartAnimation;

    if (typeof window !== 'undefined') {
      const AdobeAn = window.AdobeAn;
      const compID = "77EE05FCC4694DC9B740761F53D7E669"
      const comp = AdobeAn.getComposition(compID);
      let lib_mobile = comp.getLibrary();
      var ss=comp.getSpriteSheet();
      let exportRoot = new lib_mobile.Hardhatmobilev4HTML5Canvas2lib();
      let stage = new lib_mobile.Stage(mobile_canvas);	
      //Registers the "tick" event listener.
      fnStartAnimation = function() {
        stage.addChild(exportRoot);
        createjs.Ticker.framerate = lib_mobile.properties.fps;
        createjs.Ticker.addEventListener("tick", stage);
      }	    
      //Code to support hidpi screens and responsive scaling.
      AdobeAn.makeResponsive(
        false,
        "both",
        false,
        1,
        [mobile_canvas, mobile_anim_container],
        stage
      );	
      AdobeAn.compositionLoaded(lib_mobile.properties.id);

      fnStartAnimation();
    }
    window.addEventListener('scroll', this.handleScroll)
  },
  destroyed() {
    window.removeEventListener('scroll', this.handleScroll);
  },
  methods: {
    handleScroll(e) {
      let scrollOffset = window.scrollY;
      this.$refs.mobileAnimationContainer.style.transform = `translateY(${scrollOffset / 3}px)`;
      this.$refs.ethereumBg.style.opacity = 1 - scrollOffset / 200;
      this.$refs.mobileImageWrapper.style.background = `linear-gradient(180deg, transparent ${scrollOffset > 100 ? 100 : scrollOffset < 0 ? 0 : scrollOffset}%, white ${scrollOffset > 100 ? 100 : scrollOffset < 0 ? 0 : scrollOffset + 50}%, white 100%)`;
    }
  }
};
</script>

<style lang="stylus" scoped>
.hero-image-wrapper
  display none
  pointer-events none
  z-index 100000000 !important
  @media (max-width: 1000px)
    background linear-gradient(180deg, transparent 0%, white 50%, white 100%)
    position fixed
    bottom 0
    left 0
    width 100%
    height 216px
    display flex
    justify-content center
    align-items center
    transform-origin bottom
    transform scale(1.2)
    // transition ease-in-out 0.5s background
    &.hero-image-hidden
      background transparent
  @media (max-width: 720px)
    transform scale(1)
  @media (max-height: 800px)
    transform scale(0.7)
  #ethereum-bg
    width 180px
    height 306px
    background-image url('../img/animated_hero_mobile/logo_eth.svg')
    background-size contain
    background-repeat no-repeat
    position fixed
    bottom -24px
    left calc(50% - 90px)
    z-index -1
    pointer-events none
  #mobile_animation_container
    z-index 1
    bottom 0
    transform translateY(0)
    pointer-events none
    #mobile_canvas
      width inherit !important
      height inherit !important
      position absolute
</style>
