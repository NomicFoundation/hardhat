<template lang="pug">
.hero-image-wrapper
  .hero-frame
    #animation_container(ref="animationContainer")
      canvas#canvas(ref="canvas", width="1120", height="693")
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
import "../img/animated_hero/Harhdat-hero.js";

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

const AdobeAn = window.AdobeAn;
const loader = new createjs.LoadQueue(false);
const comp = AdobeAn.getComposition("36A1779EF9C24DC9B80C7DE50F290651");
let lib = comp.getLibrary();

loader.addEventListener("fileload", (evt) => {
  const images = comp.getImages();
  if (evt && evt.item.type === "image") {
    images[evt.item.id] = evt.result;
  }
});

const completedPromise = new Promise((resolve) => {
  loader.addEventListener("complete", (evt) => {
    const ss = comp.getSpriteSheet();
    const queue = evt.target;
    const ssMetadata = lib.ssMetadata;

    for (let i = 0; i < ssMetadata.length; i++) {
      ss[ssMetadata[i].name] = new createjs.SpriteSheet({
        images: [queue.getResult(ssMetadata[i].name)],
        frames: ssMetadata[i].frames,
      });
    }

    AdobeAn.compositionLoaded(lib.properties.id);

    resolve();
  });
});

loader.loadManifest(lib.properties.manifest);

export default {
  name: "HHAnimation",
  mounted() {
    completedPromise.then(() => {
      this.stage = new lib.Stage(this.$refs.canvas);

      //Code to support hidpi screens and responsive scaling.
      this.responsivenessListener = AdobeAn.makeResponsive(
        false,
        "both",
        false,
        1,
        [this.$refs.canvas, this.$refs.animationContainer],
        this.stage
      );

      //Registers the "tick" event listener.
      const exportRoot = new lib.Harhdatherov9reduccionpeso();
      this.stage.addChild(exportRoot);
      createjs.Ticker.framerate = lib.properties.fps;
      createjs.Ticker.addEventListener("tick", this.stage);
    });
  },
  beforeDestroy() {
    if (this.stage) {
      createjs.Ticker.removeEventListener("tick", this.stage);
    }

    if (this.responsivenessListener) {
      window.removeEventListener("resize", this.responsivenessListener);
    }
  },
};
</script>

<style lang="stylus" scoped>
.hero-image-wrapper
  flex-grow 1
  display flex
  flex-direction column
  justify-content center
  @media (max-width: 1000px)
    height 40vh
    max-height 693px
    min-height 200px
    transform scale(1)
    z-index -1
    top 60px
    right 10%
    width 100%
    display flex
    align-items center
  @media (max-width: 820px)
    // top 100px
    transform scale(0.6) translateY(30px)
  .hero-frame
    position absolute
    z-index -1
    border none
    width 1130px
    height 693px
    right -460px
    @media (max-width: 1000px)
      top unset
      right unset
</style>
