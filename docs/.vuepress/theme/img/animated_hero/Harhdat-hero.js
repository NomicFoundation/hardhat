// This file was manually modified to:
//   - Getting the images' urls using Webpack
//   - Get the createjs instance from window
//   - Define window.AdobeAn and use it
//   - Make the am.makeResponsive method return the listener
//
// You can search for the comments with the tag [MODIFIED] to find where
// and how they took place.

// [MODIFIED]: Added these imports
import CachedBmp from "./CachedBmp_9.png";
import HardhatHeroAtlas1 from "./Harhdat_hero_atlas_1.png";
import HardhatHeroAtlas2 from "./Harhdat_hero_atlas_2.png";

// [MODIFIED]: Added this definition
window.AdobeAn = window.AdobeAn || {};

(function (cjs, an) {
  var p; // shortcut to reference prototypes
  var lib = {};
  var ss = {};
  var img = {};
  lib.ssMetadata = [
    { name: "Harhdat_hero_atlas_1", frames: [[0, 0, 1649, 1430]] },
    {
      name: "Harhdat_hero_atlas_2",
      frames: [
        [1009, 279, 234, 263],
        [1258, 0, 234, 215],
        [1009, 879, 128, 67],
        [1009, 1061, 66, 103],
        [1074, 948, 57, 107],
        [1009, 732, 136, 145],
        [1258, 217, 272, 183],
        [1494, 0, 148, 143],
        [1009, 544, 277, 186],
        [1009, 0, 247, 277],
        [1494, 145, 134, 65],
        [1245, 402, 74, 139],
        [1009, 948, 63, 111],
        [0, 0, 670, 1139],
        [672, 0, 335, 1139],
      ],
    },
  ];

  (lib.AnMovieClip = function () {
    this.actionFrames = [];
    this.gotoAndPlay = function (positionOrLabel) {
      cjs.MovieClip.prototype.gotoAndPlay.call(this, positionOrLabel);
    };
    this.play = function () {
      cjs.MovieClip.prototype.play.call(this);
    };
    this.gotoAndStop = function (positionOrLabel) {
      cjs.MovieClip.prototype.gotoAndStop.call(this, positionOrLabel);
    };
    this.stop = function () {
      cjs.MovieClip.prototype.stop.call(this);
    };
  }).prototype = p = new cjs.MovieClip();
  // symbols:

  (lib.CachedBmp_17 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(0);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_16 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(1);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_15 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(2);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_14 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(3);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_13 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(4);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_12 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(5);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_21 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(6);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_10 = function () {
    this.initialize(ss["Harhdat_hero_atlas_1"]);
    this.gotoAndStop(0);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_9 = function () {
    this.initialize(img.CachedBmp_9);
  }).prototype = p = new cjs.Bitmap();
  p.nominalBounds = new cjs.Rectangle(0, 0, 5930, 5314);

  (lib.CachedBmp_8 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(7);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_20 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(8);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_6 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(9);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_5 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(10);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_4 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(11);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_3 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(12);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_19 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(13);
  }).prototype = p = new cjs.Sprite();

  (lib.CachedBmp_18 = function () {
    this.initialize(ss["Harhdat_hero_atlas_2"]);
    this.gotoAndStop(14);
  }).prototype = p = new cjs.Sprite();
  // helper functions:

  function mc_symbol_clone() {
    var clone = this._cloneProps(
      new this.constructor(
        this.mode,
        this.startPosition,
        this.loop,
        this.reversed
      )
    );
    clone.gotoAndStop(this.currentFrame);
    clone.paused = this.paused;
    clone.framerate = this.framerate;
    return clone;
  }

  function getMCSymbolPrototype(symbol, nominalBounds, frameBounds) {
    var prototype = cjs.extend(symbol, cjs.MovieClip);
    prototype.clone = mc_symbol_clone;
    prototype.nominalBounds = nominalBounds;
    prototype.frameBounds = frameBounds;
    return prototype;
  }

  (lib.Tween4 = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.instance = new lib.CachedBmp_16();
    this.instance.setTransform(-58.45, -53.7, 0.5, 0.5);

    this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

    // Layer_1
    this.instance_1 = new lib.CachedBmp_17();
    this.instance_1.setTransform(-58.45, -77.9, 0.5, 0.5);

    this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-58.4, -77.9, 117, 131.7);

  (lib.Tween2 = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.shape = new cjs.Shape();
    this.shape.graphics
      .f("#363233")
      .s()
      .p(
        "AnfBLQjHgbAAgjIAAgyIB0gWQCDgYBEgFQCmgODFAAQDEAACmAOQBuAKDPAeIAABAQAAAkjIAaQjHAZkYAAQkVgBjKgbg"
      );

    this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-67.9, -10.2, 135.8, 20.5);

  (lib.Tween1 = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.shape = new cjs.Shape();
    this.shape.graphics
      .f("#363233")
      .s()
      .p(
        "AnfBLQjHgbAAgjIAAgyIB0gWQCDgYBEgFQCmgODFAAQDEAACmAOQBuAKDPAeIAABAQAAAkjIAaQjHAZkYAAQkVgBjKgbg"
      );

    this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-67.9, -10.2, 135.8, 20.5);

  (lib.sheheadback = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.shape = new cjs.Shape();
    this.shape.graphics
      .lf(["#4F00A3", "#23004E"], [0, 1], 0, 48.8, 0, -34.8)
      .s()
      .p("AlQIBQhUgBg8g7Qg7g8AAhUIAAs1IQ3AAIAAQBg");
    this.shape.setTransform(0, 5);

    this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-54, -46.2, 108, 102.5);

  (lib.sheeyes = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.shape = new cjs.Shape();
    this.shape.graphics
      .f("#262223")
      .s()
      .p(
        "AgvBKQgTgTAAgcIAAg1QAAgbATgUQAUgUAbgBIAAABIAAAAQAcAAAUAUQATAUAAAbIAAA1QAAAcgUATQgTAVgcAAQgbAAgUgVg"
      );
    this.shape.setTransform(14.85, 0);

    this.shape_1 = new cjs.Shape();
    this.shape_1.graphics
      .f("#262223")
      .s()
      .p(
        "AguBKQgTgTAAgcIAAg1QAAgbATgUQATgUAbgBIAAABIAAAAQAcAAATAUQAUAUgBAbIAAA1QABAcgUATQgTAVgcAAQgbAAgTgVg"
      );
    this.shape_1.setTransform(-14.8744, 0);

    this.timeline.addTween(
      cjs.Tween.get({})
        .to({ state: [{ t: this.shape_1 }, { t: this.shape }] })
        .wait(1)
    );

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-21.5, -9.5, 43, 19);

  (lib.ClipGroup = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_2 (mask)
    var mask = new cjs.Shape();
    mask._off = true;
    mask.graphics.p(
      "Ak4DnQANhmA0hcQAVgEAUgZQAXgaAIgkQAXhehYhRQgOgNBcAaQBfAcAnAaQADAJAzAzIA0AxQAOgYAGglQALhIgng8QBHgNA5AkQBRAyAiCKQACAIgOAlQgNAnAAAIIANBFQALBLgIAeQiCATh4ABQisAAjCgUg"
    );
    mask.setTransform(31.2879, 25.0372);

    // Layer_3
    this.instance = new lib.CachedBmp_15();
    this.instance.setTransform(1, 17.95, 0.4881, 0.4881);

    var maskedShapeInstanceList = [this.instance];

    for (
      var shapedInstanceItr = 0;
      shapedInstanceItr < maskedShapeInstanceList.length;
      shapedInstanceItr++
    ) {
      maskedShapeInstanceList[shapedInstanceItr].mask = mask;
    }

    this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

    this._renderFirstFrame();
  }).prototype = getMCSymbolPrototype(
    lib.ClipGroup,
    new cjs.Rectangle(1, 18, 61.6, 32.1),
    null
  );

  (lib.shearmRtop = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // mask_idn (mask)
    var mask = new cjs.Shape();
    mask._off = true;
    mask.graphics.p(
      "AAyFzQg8gLhUglIAAAAQhOgjgrgnIAAAAQg3gzgchRIAAAAQgYhIAAhVIAAAAQAAhtAlhPIAAAAQAWgtAhgiIAAAAQAkgkAsgRIAAAAQBHgbBPAVIAAAAQAaAHAcANIAAAAQgFACgBAFIAAAAIgBADIAAAAIABgDIAAAAQABgFAFgCIAAAAQADgCAFAAIAAAAQAGAAALAFIAAAAIAkAQQALAFAGAFIAAAAQAJAIgBAKIAAAAQgBAFgEAEIAAAAIgDACIAAAAIAHASIAAAAQAHARAJAIIAAAAQAKAIAYAIIAAAAQAOAHAOAOIAAAAQAIAJAOAUIAAAAQAgAuAQAeIAAAAQAYAsAIAoIAAAAQAGAhgCAzIAAAAQgDA/gOA1IAAAAQgPBAggAuIAAAAQglA2g0AUIAAAAQgeALglAAIAAAAQgZAAgcgFgABkFeIAAAAIAAAAIAAAAgABlFeQAcAAAWgHIAAAAQgWAHgcAAgABhkJQAAAIAIAJIAAAAQAMAOAaANIAAAAQAkASAHAFIAAAAQASAMAQAWIAAAAQAKAOARAcIAAAAQATAhAJATIAAAAQAOAeAFAaIAAAAQADATAAAZIAAAAQAAgZgDgTIAAAAQgFgagOgeIAAAAQgJgTgTghIAAAAQgRgcgKgOIAAAAQgQgWgSgMIAAAAQgHgFgkgSIAAAAQgagNgMgOIAAAAQgIgJAAgIIAAAAIAAAAgAiClSQgtANgkAkIAAAAQgiAigUAvIAAAAQgeBEAABrIAAAAQAAhrAehEIAAAAQAUgvAigiIAAAAQAkgkAtgNIAAAAIAAAAgABlkTQADgCACgBIAAAAQgCABgDACgABtkWQgPgVgsgVIAAAAQgdgPgVgGIAAAAQgVgGgkAAIAAAAQAkAAAVAGIAAAAQAVAGAdAPIAAAAQAsAVAPAVIAAAAIAAAAgABtkWIgBAAIAAAAIABAAgABskWIAAAAIAAAAIAAAAgAB/kfIAAAAIAAAAIAAAAgACAkfIABAAIAAAAIgBAAgAB/kfIgBAAIAAAAIABAAgACCkfIACgBIAAAAIgCABgAh+lTIABgBIAAAAIgBABgAh9lUQAbgHAhAAIAAAAQghAAgbAHgAhBlbIAAAAIAAAAIAAAAg"
    );
    mask.setTransform(4.685, 8.5095);

    // she_arm_R
    this.instance = new lib.CachedBmp_14();
    this.instance.setTransform(-13.7, -25.45, 0.5, 0.5);

    var maskedShapeInstanceList = [this.instance];

    for (
      var shapedInstanceItr = 0;
      shapedInstanceItr < maskedShapeInstanceList.length;
      shapedInstanceItr++
    ) {
      maskedShapeInstanceList[shapedInstanceItr].mask = mask;
    }

    this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-13.7, -25.4, 33, 51.5);

  (lib.shearmL = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // she_arm_L
    this.instance = new lib.CachedBmp_13();
    this.instance.setTransform(-15.8, -27.15, 0.5, 0.5);

    this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-15.8, -27.1, 28.5, 53.5);

  (lib.she_legs = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.instance = new lib.CachedBmp_12();
    this.instance.setTransform(-35.2, -30.75, 0.5, 0.5);

    this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-35.2, -30.7, 68, 72.5);

  (lib.she_helmet = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.instance = new lib.CachedBmp_21();
    this.instance.setTransform(-68.05, -45.65, 0.5, 0.5);

    this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-68, -45.6, 136, 91.5);

  (lib.Path32 = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.shape = new cjs.Shape();
    this.shape.graphics
      .lf(["#E9DEFA", "#FBFCDB"], [0, 1], 0, 113.3, 0, -113.2)
      .s()
      .p("AtGzGIaNQtIAAVgg");
    this.shape.setTransform(83.875, 122.275);

    this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

    this._renderFirstFrame();
  }).prototype = getMCSymbolPrototype(
    lib.Path32,
    new cjs.Rectangle(0, 0, 167.8, 244.6),
    null
  );

  (lib.Path30 = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.shape = new cjs.Shape();
    this.shape.graphics
      .lf(["#E9DEFA", "#FBFCDB"], [0, 1], 8, -158.5, 55.1, 285.3)
      .s()
      .p("AtEOYMAaJgtZMAAAA+Dg");
    this.shape.setTransform(83.725, 198.625);

    this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

    this._renderFirstFrame();
  }).prototype = getMCSymbolPrototype(
    lib.Path30,
    new cjs.Rectangle(0, 0, 167.5, 397.3),
    null
  );

  (lib.ClipGroup_1 = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_2 (mask)
    var mask_1 = new cjs.Shape();
    mask_1._off = true;
    mask_1.graphics.p("Eg+9A2LMAAAhsVMB97AAAMAAABsVg");
    mask_1.setTransform(403, 355.625);

    // Layer_3
    this.instance_1 = new lib.CachedBmp_10();
    this.instance_1.setTransform(0, 0, 0.5, 0.5);

    var maskedShapeInstanceList = [this.instance_1];

    for (
      var shapedInstanceItr = 0;
      shapedInstanceItr < maskedShapeInstanceList.length;
      shapedInstanceItr++
    ) {
      maskedShapeInstanceList[shapedInstanceItr].mask = mask_1;
    }

    this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(1));

    this._renderFirstFrame();
  }).prototype = getMCSymbolPrototype(
    lib.ClipGroup_1,
    new cjs.Rectangle(0, 9, 806, 693.3),
    null
  );

  (lib.reflect = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.instance = new lib.CachedBmp_9();
    this.instance.setTransform(-261.8, 0, 0.5, 0.5);

    this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

    this._renderFirstFrame();
  }).prototype = getMCSymbolPrototype(
    lib.reflect,
    new cjs.Rectangle(-261.8, 0, 2965, 2657),
    null
  );

  (lib.helegs = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // he_legs
    this.instance = new lib.CachedBmp_8();
    this.instance.setTransform(-35, -29.7, 0.5, 0.5);

    this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-35, -29.7, 74, 71.5);

  (lib.hehelmetback = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.shape = new cjs.Shape();
    this.shape.graphics
      .f("#262223")
      .s()
      .p(
        "AnoBPQjKgaAAgkIAAhCQDSgfBwgKQCqgNDGAAQDIAACpANQBGAGCFAYIB3AXIAAA2QAAAkjLAaQjLAZkdAAQkeAAjKgZg"
      );
    this.shape.setTransform(0.025, 0.025);

    this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-69, -10.4, 138.1, 20.9);

  (lib.hehelmet = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.instance = new lib.CachedBmp_20();
    this.instance.setTransform(-69.15, -46.45, 0.5, 0.5);

    this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-69.1, -46.4, 138.5, 93);

  (lib.hehead = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.instance = new lib.CachedBmp_6();
    this.instance.setTransform(-61.9, -78.4, 0.5, 0.5);

    this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-61.9, -78.4, 123.5, 138.5);

  (lib.heeyes = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.shape = new cjs.Shape();
    this.shape.graphics
      .f("#262223")
      .s()
      .p(
        "AgwBLQgUgUAAgcIAAg1QAAgcAVgUQAUgUAbAAQAcAAAVAUQATAUABAcIAAA1QAAAcgUAUQgUAUgdAAQgcAAgUgUg"
      );
    this.shape.setTransform(-15.6, -0.0006);

    this.shape_1 = new cjs.Shape();
    this.shape_1.graphics
      .f("#2E3033")
      .s()
      .p(
        "AgvBLQgVgUAAgcIAAg1QAAgcAVgUQAUgUAbAAQAdAAAUAUQAUAUAAAcIAAA1QAAAcgUAUQgUAUgdAAQgcAAgTgUg"
      );
    this.shape_1.setTransform(15.55, -0.0006);

    this.timeline.addTween(
      cjs.Tween.get({})
        .to({ state: [{ t: this.shape_1 }, { t: this.shape }] })
        .wait(1)
    );

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-22.5, -9.5, 45, 19);

  (lib.ClipGroup_2 = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_2 (mask)
    var mask_2 = new cjs.Shape();
    mask_2._off = true;
    mask_2.graphics.p(
      "Ak8DeQgJgggEhxQgEhpADgPQAiiLA/gqQApgbBFAMQgnA8AgBDQAQAiAXAVQByhaAGgOQAngbBbgfQBagegPANQhWBPA2BjQAUAlAiAbQAeAaAVAFQAJBTAQBpQjcATirAAQh+gCiDgUg"
    );
    mask_2.setTransform(34.1857, 24.3904);

    // Layer_3
    this.instance_2 = new lib.CachedBmp_5();
    this.instance_2.setTransform(0, 16.7, 0.5, 0.5);

    var maskedShapeInstanceList = [this.instance_2];

    for (
      var shapedInstanceItr = 0;
      shapedInstanceItr < maskedShapeInstanceList.length;
      shapedInstanceItr++
    ) {
      maskedShapeInstanceList[shapedInstanceItr].mask = mask_2;
    }

    this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(1));

    this._renderFirstFrame();
  }).prototype = getMCSymbolPrototype(
    lib.ClipGroup_2,
    new cjs.Rectangle(1, 16.7, 66, 32.099999999999994),
    null
  );

  (lib.hearmL = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.instance = new lib.CachedBmp_4();
    this.instance.setTransform(-24, -26.2, 0.5, 0.5);

    this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-24, -26.2, 37, 69.5);

  (lib.hearm_R = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // he_arm_R
    this.instance = new lib.CachedBmp_3();
    this.instance.setTransform(-16, -24.45, 0.5, 0.5);

    this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-16, -24.4, 31.5, 55.5);

  (lib.shadow2 = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.shape = new cjs.Shape();
    this.shape.graphics
      .f("#9B9FA8")
      .s()
      .p(
        "AmcBAQisgbAAglQAAgkCsgbQCrgaDxAAQDyAACrAaQCsAbAAAkQAAAlisAbQirAajyAAQjxAAirgag"
      );
    this.shape.setTransform(58.5, 9);

    this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

    this._renderFirstFrame();
  }).prototype = getMCSymbolPrototype(
    lib.shadow2,
    new cjs.Rectangle(0, 0, 117, 18),
    null
  );

  (lib.she_body = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // she_body
    this.instance = new lib.ClipGroup();
    this.instance.setTransform(1.8, 1.4, 1, 1, 0, 0, 0, 31.7, 25.3);

    this.shape = new cjs.Shape();
    this.shape.graphics
      .f("#EDCF00")
      .s()
      .p(
        "Ak4DnQANhmA0hcQAVgEAUgZQAXgaAIgkQAXhehYhRQgOgNBcAaQBfAcAnAaQADAJAzAzIA0AxQAOgYAGglQALhIgng8QBHgNA5AkQBRAyAiCKQACAIgOAlQgNAnAAAIIANBFQALBLgIAeQiCATh4ABQisAAjCgUg"
      );
    this.shape.setTransform(1.3879, 1.1372);

    this.shape_1 = new cjs.Shape();
    this.shape_1.graphics
      .f("#F2EDDC")
      .s()
      .p(
        "Aj/DAQAKgjAAgTQAUg1AHg2QADgagBgMQgCgWgJgIQgFgEgRgBQgZgCgeAKQgfAKAjhCQAhg9AjgiQACgMAqgNQBUgbDKgKIDeDoIgGEGIpDABQAAgUAKgkg"
      );
    this.shape_1.setTransform(-1.0211, -0.15);

    this.timeline.addTween(
      cjs.Tween.get({})
        .to({
          state: [{ t: this.shape_1 }, { t: this.shape }, { t: this.instance }],
        })
        .wait(1)
    );

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-33, -24.9, 66.6, 51.7);

  (lib.she = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // she_eyes
    this.instance = new lib.sheeyes("synched", 0);
    this.instance.setTransform(94.5, 265.5);

    this.timeline.addTween(
      cjs.Tween.get(this.instance)
        .wait(21)
        .to({ scaleY: 0.2526 }, 0)
        .to({ scaleY: 1 }, 5, cjs.Ease.cubicOut)
        .to({ y: 267.1 }, 73)
        .to({ y: 265.5 }, 94)
        .wait(1)
    );

    // she_helmet
    this.instance_1 = new lib.she_helmet("synched", 0);
    this.instance_1.setTransform(87.55, 184.65);

    this.timeline.addTween(
      cjs.Tween.get(this.instance_1)
        .wait(21)
        .to({ y: 185.35 }, 0)
        .to({ y: 184.65 }, 5)
        .to({ y: 186.25 }, 73)
        .to({ y: 184.65 }, 94)
        .wait(1)
    );

    // she_head
    this.instance_2 = new lib.Tween4("synched", 0);
    this.instance_2.setTransform(88.4, 249.7);

    this.timeline.addTween(
      cjs.Tween.get(this.instance_2)
        .wait(21)
        .to({ y: 249.9 }, 0)
        .to({ y: 249.7 }, 5)
        .to({ y: 250.75 }, 48)
        .to({ y: 251.3 }, 25)
        .to({ y: 249.7 }, 94)
        .wait(1)
    );

    // she_body
    this.instance_3 = new lib.she_body("synched", 0);
    this.instance_3.setTransform(90, 317.25);

    this.timeline.addTween(
      cjs.Tween.get(this.instance_3)
        .wait(1)
        .to({ regX: -0.2, regY: 0.6, x: 89.8, y: 317.8 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0001 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0002 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0003 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0004 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0005 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0006 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0007 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0008 }, 0)
        .wait(1)
        .to({ scaleX: 1.0009 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.001 }, 0)
        .wait(1)
        .to({ scaleX: 1.0011 }, 0)
        .wait(1)
        .to({ scaleX: 1.0012 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0013 }, 0)
        .wait(1)
        .to({ scaleX: 1.0014 }, 0)
        .wait(1)
        .to({ scaleX: 1.0015 }, 0)
        .wait(1)
        .to({ scaleX: 1.0016 }, 0)
        .wait(1)
        .to({ scaleX: 1.0017 }, 0)
        .wait(1)
        .to({ scaleX: 1.0018 }, 0)
        .wait(1)
        .to({ scaleX: 1.0019 }, 0)
        .wait(1)
        .to({ scaleX: 1.002 }, 0)
        .wait(1)
        .to({ scaleX: 1.0021 }, 0)
        .wait(1)
        .to({ scaleX: 1.0022 }, 0)
        .wait(1)
        .to({ scaleX: 1.0024 }, 0)
        .wait(1)
        .to({ scaleX: 1.0025 }, 0)
        .wait(1)
        .to({ scaleX: 1.0026 }, 0)
        .wait(1)
        .to({ scaleX: 1.0028 }, 0)
        .wait(1)
        .to({ scaleX: 1.0029 }, 0)
        .wait(1)
        .to({ scaleX: 1.003 }, 0)
        .wait(1)
        .to({ scaleX: 1.0032, y: 317.75 }, 0)
        .wait(1)
        .to({ scaleX: 1.0033 }, 0)
        .wait(1)
        .to({ scaleX: 1.0035 }, 0)
        .wait(1)
        .to({ scaleX: 1.0037 }, 0)
        .wait(1)
        .to({ scaleX: 1.0038 }, 0)
        .wait(1)
        .to({ scaleX: 1.004 }, 0)
        .wait(1)
        .to({ scaleX: 1.0042 }, 0)
        .wait(1)
        .to({ scaleX: 1.0044 }, 0)
        .wait(1)
        .to({ scaleX: 1.0046 }, 0)
        .wait(1)
        .to({ scaleX: 1.0048 }, 0)
        .wait(1)
        .to({ scaleX: 1.005 }, 0)
        .wait(1)
        .to({ scaleX: 1.0052 }, 0)
        .wait(1)
        .to({ scaleX: 1.0054 }, 0)
        .wait(1)
        .to({ scaleX: 1.0056 }, 0)
        .wait(1)
        .to({ scaleX: 1.0059 }, 0)
        .wait(1)
        .to({ scaleX: 1.0061 }, 0)
        .wait(1)
        .to({ scaleX: 1.0063, y: 317.7 }, 0)
        .wait(1)
        .to({ scaleX: 1.0066 }, 0)
        .wait(1)
        .to({ scaleX: 1.0069 }, 0)
        .wait(1)
        .to({ scaleX: 1.0071 }, 0)
        .wait(1)
        .to({ scaleX: 1.0074 }, 0)
        .wait(1)
        .to({ scaleX: 1.0077 }, 0)
        .wait(1)
        .to({ scaleX: 1.008 }, 0)
        .wait(1)
        .to({ scaleX: 1.0083 }, 0)
        .wait(1)
        .to({ scaleX: 1.0086 }, 0)
        .wait(1)
        .to({ scaleX: 1.009 }, 0)
        .wait(1)
        .to({ scaleX: 1.0093, y: 317.65 }, 0)
        .wait(1)
        .to({ scaleX: 1.0097 }, 0)
        .wait(1)
        .to({ scaleX: 1.01 }, 0)
        .wait(1)
        .to({ scaleX: 1.0104 }, 0)
        .wait(1)
        .to({ scaleX: 1.0108 }, 0)
        .wait(1)
        .to({ scaleX: 1.0112 }, 0)
        .wait(1)
        .to({ scaleX: 1.0116 }, 0)
        .wait(1)
        .to({ scaleX: 1.012 }, 0)
        .wait(1)
        .to({ scaleX: 1.0125, y: 317.6 }, 0)
        .wait(1)
        .to({ scaleX: 1.0129 }, 0)
        .wait(1)
        .to({ scaleX: 1.0134 }, 0)
        .wait(1)
        .to({ scaleX: 1.0139 }, 0)
        .wait(1)
        .to({ scaleX: 1.0144 }, 0)
        .wait(1)
        .to({ scaleX: 1.0149 }, 0)
        .wait(1)
        .to({ scaleX: 1.0154, y: 317.55 }, 0)
        .wait(1)
        .to({ scaleX: 1.0159 }, 0)
        .wait(1)
        .to({ scaleX: 1.0165 }, 0)
        .wait(1)
        .to({ scaleX: 1.0171 }, 0)
        .wait(1)
        .to({ scaleX: 1.0176 }, 0)
        .wait(1)
        .to({ scaleX: 1.0182 }, 0)
        .wait(1)
        .to({ scaleX: 1.0188, y: 317.5 }, 0)
        .wait(1)
        .to({ scaleX: 1.0194 }, 0)
        .wait(1)
        .to({ scaleX: 1.02 }, 0)
        .wait(1)
        .to({ scaleX: 1.0207 }, 0)
        .wait(1)
        .to({ scaleX: 1.0213 }, 0)
        .wait(1)
        .to({ scaleX: 1.0219, y: 317.45 }, 0)
        .wait(1)
        .to({ scaleX: 1.0226 }, 0)
        .wait(1)
        .to({ scaleX: 1.0232 }, 0)
        .wait(1)
        .to({ scaleX: 1.0238 }, 0)
        .wait(1)
        .to({ regX: 0, regY: 0, scaleX: 1.0245, x: 90, y: 316.85 }, 0)
        .wait(1)
        .to({ regX: -0.2, regY: 0.6, scaleX: 1.0237, x: 89.8, y: 317.45 }, 0)
        .wait(1)
        .to({ scaleX: 1.023 }, 0)
        .wait(1)
        .to({ scaleX: 1.0222 }, 0)
        .wait(1)
        .to({ scaleX: 1.0215 }, 0)
        .wait(1)
        .to({ scaleX: 1.0208, y: 317.5 }, 0)
        .wait(1)
        .to({ scaleX: 1.0201 }, 0)
        .wait(1)
        .to({ scaleX: 1.0194 }, 0)
        .wait(1)
        .to({ scaleX: 1.0187 }, 0)
        .wait(1)
        .to({ scaleX: 1.018, y: 317.55 }, 0)
        .wait(1)
        .to({ scaleX: 1.0174 }, 0)
        .wait(1)
        .to({ scaleX: 1.0168 }, 0)
        .wait(1)
        .to({ scaleX: 1.0161 }, 0)
        .wait(1)
        .to({ scaleX: 1.0156 }, 0)
        .wait(1)
        .to({ scaleX: 1.015, y: 317.6 }, 0)
        .wait(1)
        .to({ scaleX: 1.0144 }, 0)
        .wait(1)
        .to({ scaleX: 1.0139 }, 0)
        .wait(1)
        .to({ scaleX: 1.0134 }, 0)
        .wait(1)
        .to({ scaleX: 1.0128 }, 0)
        .wait(1)
        .to({ scaleX: 1.0123 }, 0)
        .wait(1)
        .to({ scaleX: 1.0119, y: 317.65 }, 0)
        .wait(1)
        .to({ scaleX: 1.0114 }, 0)
        .wait(1)
        .to({ scaleX: 1.011 }, 0)
        .wait(1)
        .to({ scaleX: 1.0105 }, 0)
        .wait(1)
        .to({ scaleX: 1.0101 }, 0)
        .wait(1)
        .to({ scaleX: 1.0097 }, 0)
        .wait(1)
        .to({ scaleX: 1.0093 }, 0)
        .wait(1)
        .to({ scaleX: 1.0089, y: 317.7 }, 0)
        .wait(1)
        .to({ scaleX: 1.0086 }, 0)
        .wait(1)
        .to({ scaleX: 1.0082 }, 0)
        .wait(1)
        .to({ scaleX: 1.0079 }, 0)
        .wait(1)
        .to({ scaleX: 1.0076 }, 0)
        .wait(1)
        .to({ scaleX: 1.0072 }, 0)
        .wait(1)
        .to({ scaleX: 1.0069 }, 0)
        .wait(1)
        .to({ scaleX: 1.0066 }, 0)
        .wait(1)
        .to({ scaleX: 1.0064 }, 0)
        .wait(1)
        .to({ scaleX: 1.0061, y: 317.75 }, 0)
        .wait(1)
        .to({ scaleX: 1.0058 }, 0)
        .wait(1)
        .to({ scaleX: 1.0056 }, 0)
        .wait(1)
        .to({ scaleX: 1.0053 }, 0)
        .wait(1)
        .to({ scaleX: 1.0051 }, 0)
        .wait(1)
        .to({ scaleX: 1.0048 }, 0)
        .wait(1)
        .to({ scaleX: 1.0046 }, 0)
        .wait(1)
        .to({ scaleX: 1.0044 }, 0)
        .wait(1)
        .to({ scaleX: 1.0042 }, 0)
        .wait(1)
        .to({ scaleX: 1.004 }, 0)
        .wait(1)
        .to({ scaleX: 1.0038 }, 0)
        .wait(1)
        .to({ scaleX: 1.0036 }, 0)
        .wait(1)
        .to({ scaleX: 1.0034 }, 0)
        .wait(1)
        .to({ scaleX: 1.0032 }, 0)
        .wait(1)
        .to({ scaleX: 1.0031 }, 0)
        .wait(1)
        .to({ scaleX: 1.0029, y: 317.8 }, 0)
        .wait(1)
        .to({ scaleX: 1.0028 }, 0)
        .wait(1)
        .to({ scaleX: 1.0026 }, 0)
        .wait(1)
        .to({ scaleX: 1.0025 }, 0)
        .wait(1)
        .to({ scaleX: 1.0023 }, 0)
        .wait(1)
        .to({ scaleX: 1.0022 }, 0)
        .wait(1)
        .to({ scaleX: 1.0021 }, 0)
        .wait(1)
        .to({ scaleX: 1.0019 }, 0)
        .wait(1)
        .to({ scaleX: 1.0018 }, 0)
        .wait(1)
        .to({ scaleX: 1.0017 }, 0)
        .wait(1)
        .to({ scaleX: 1.0016 }, 0)
        .wait(1)
        .to({ scaleX: 1.0015 }, 0)
        .wait(1)
        .to({ scaleX: 1.0014 }, 0)
        .wait(1)
        .to({ scaleX: 1.0013 }, 0)
        .wait(1)
        .to({ scaleX: 1.0012 }, 0)
        .wait(1)
        .to({ scaleX: 1.0011 }, 0)
        .wait(1)
        .to({ scaleX: 1.001 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0009 }, 0)
        .wait(1)
        .to({ scaleX: 1.0008 }, 0)
        .wait(1)
        .to({ scaleX: 1.0007 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0006 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0005 }, 0)
        .wait(1)
        .to({ scaleX: 1.0004 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0003 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0002 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1.0001 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ scaleX: 1 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ regX: 0, regY: 0, x: 90, y: 317.25 }, 0)
        .wait(1)
    );

    // she_legs
    this.instance_4 = new lib.she_legs("synched", 0);
    this.instance_4.setTransform(89.65, 367.2);

    this.timeline.addTween(
      cjs.Tween.get(this.instance_4)
        .wait(186)
        .to({ x: 89.45, y: 367.4 }, 0)
        .wait(8)
    );

    // she_arm_L
    this.instance_5 = new lib.shearmL("synched", 0);
    this.instance_5.setTransform(128.15, 322.7);

    this.timeline.addTween(
      cjs.Tween.get(this.instance_5)
        .to({ y: 321.95 }, 99, cjs.Ease.quadInOut)
        .to({ y: 322.7 }, 94, cjs.Ease.quadInOut)
        .wait(1)
    );

    // she_helmet_back
    this.shape = new cjs.Shape();
    this.shape.graphics
      .f("#363233")
      .s()
      .p(
        "AnfBLQjHgbAAgjIAAgyIB0gWQCDgYBEgFQCmgODFAAQDEAACmAOQBuAKDPAeIAABAQAAAkjIAaQjHAZkYAAQkVgBjKgbg"
      );
    this.shape.setTransform(87.4, 224.1);

    this.instance_6 = new lib.Tween1("synched", 0);
    this.instance_6.setTransform(87.4, 224.8);
    this.instance_6._off = true;

    this.instance_7 = new lib.Tween2("synched", 0);
    this.instance_7.setTransform(87.4, 224.1);

    this.timeline.addTween(
      cjs.Tween.get({})
        .to({ state: [{ t: this.shape }] })
        .to({ state: [{ t: this.instance_6 }] }, 21)
        .to({ state: [{ t: this.instance_7 }] }, 5)
        .wait(168)
    );
    this.timeline.addTween(
      cjs.Tween.get(this.instance_6)
        .wait(21)
        .to({ _off: false }, 0)
        .to({ _off: true, y: 224.1 }, 5)
        .wait(168)
    );

    // she_head_back
    this.instance_8 = new lib.sheheadback("synched", 0);
    this.instance_8.setTransform(83.95, 266.25);

    this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(194));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(19.5, 139, 136, 270.2);

  (lib.shadow = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_1
    this.instance = new lib.shadow2();
    this.instance.setTransform(0, 0, 1, 1, 0, 0, 0, 58.5, 9);
    this.instance.alpha = 0.1016;
    this.instance.filters = [new cjs.BlurFilter(6, 6, 3)];
    this.instance.cache(-2, -2, 121, 22);

    this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-66.5, -17, 136, 38);

  (lib.ClipGroup_3 = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // hero_Bricks_back_svg
    this.instance_3 = new lib.ClipGroup_1();
    this.instance_3.setTransform(412.2, 348.5, 1, 1, 0, 0, 0, 412.2, 357.5);

    this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(1));

    this._renderFirstFrame();
  }).prototype = getMCSymbolPrototype(
    lib.ClipGroup_3,
    new cjs.Rectangle(0, -9, 824.5, 715),
    null
  );

  (lib.ClipGroup_4 = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // Layer_2 (mask)
    var mask_3 = new cjs.Shape();
    mask_3._off = true;
    mask_3.graphics.p("Eg+9A2LMAAAhsVMB97AAAMAAABsVg");
    mask_3.setTransform(2281.1, 443.725);

    // Layer_3
    this.instance_4 = new lib.reflect();
    this.instance_4.setTransform(1220.7, 1328.5, 1, 1, 0, 0, 0, 1220.7, 1328.5);
    this.instance_4.alpha = 0.25;

    var maskedShapeInstanceList = [this.instance_4];

    for (
      var shapedInstanceItr = 0;
      shapedInstanceItr < maskedShapeInstanceList.length;
      shapedInstanceItr++
    ) {
      maskedShapeInstanceList[shapedInstanceItr].mask = mask_3;
    }

    this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1));

    this._renderFirstFrame();
  }).prototype = getMCSymbolPrototype(
    lib.ClipGroup_4,
    new cjs.Rectangle(1878.1, 97.1, 806, 693.3),
    null
  );

  (lib.hebody = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // he_body
    this.instance = new lib.ClipGroup_2();
    this.instance.setTransform(-1.7, 4.2, 1, 1, 0, 0, 0, 33.7, 24.7);

    this.shape = new cjs.Shape();
    this.shape.graphics
      .f("#EDCF00")
      .s()
      .p(
        "Ak6DyQgIgfgEhfIgChaQAAimAkg2QAPgYAcgQIA+gcIBfBpIgyAOQAEAgAZAoQANAUAMAOQB2hcAEgPQAsgeBTgeQBSgfANAKQhACBA0BaQAbArAnATIATC6QjFAViwAAQiIgDiGgSg"
      );
    this.shape.setTransform(-1.5, 1.925);

    this.shape_1 = new cjs.Shape();
    this.shape_1.graphics
      .f("#F2EDDC")
      .s()
      .p(
        "Ak/ERIgClHQAMg3AZg3QAyhtBBACQDOAKCVAwQBLAYAhAWQAVBLAEBOQgHAAgEAEQgLAIgDANQgCAMACAWIAPBxQAMBaABAZg"
      );
    this.shape_1.setTransform(-0.625, -1.051);

    this.timeline.addTween(
      cjs.Tween.get({})
        .to({
          state: [{ t: this.shape_1 }, { t: this.shape }, { t: this.instance }],
        })
        .wait(1)
    );

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-35.4, -28.3, 67.4, 57);

  (lib.ETH_logo = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // logo_ethereum
    this.instance = new lib.CachedBmp_18();
    this.instance.setTransform(0, -284.8, 0.5, 0.5);

    this.instance_1 = new lib.Path32();
    this.instance_1.setTransform(-83.55, 162.45, 1, 1, 0, 0, 0, 83.9, 122.2);
    this.instance_1.alpha = 0.6016;

    this.instance_2 = new lib.Path30();
    this.instance_2.setTransform(-83.75, -86.2, 1, 1, 0, 0, 0, 83.7, 198.6);
    this.instance_2.alpha = 0.6016;

    this.timeline.addTween(
      cjs.Tween.get({})
        .to({
          state: [
            { t: this.instance_2 },
            { t: this.instance_1 },
            { t: this.instance },
          ],
        })
        .wait(1)
    );

    // Layer_1
    this.instance_3 = new lib.CachedBmp_19();
    this.instance_3.setTransform(-167.45, -284.8, 0.5, 0.5);

    this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(1));

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-167.4, -284.8, 335, 569.6);

  (lib.mascothe = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // he_eyes
    this.instance = new lib.heeyes("synched", 0);
    this.instance.setTransform(-11.55, 76.4);

    this.timeline.addTween(
      cjs.Tween.get(this.instance)
        .wait(127)
        .to({ scaleY: 0.1584, y: 75.6 }, 0)
        .to({ scaleY: 1 }, 5, cjs.Ease.cubicOut)
        .to({ y: 76.4 }, 61, cjs.Ease.quadInOut)
        .wait(1)
    );

    // he_helmet
    this.instance_1 = new lib.hehelmet("synched", 0);
    this.instance_1.setTransform(0, 0.8);

    this.timeline.addTween(
      cjs.Tween.get(this.instance_1)
        .to({ y: 1.5 }, 127, cjs.Ease.quadInOut)
        .to({ y: 0 }, 5, cjs.Ease.cubicInOut)
        .to({ y: 0.8 }, 61, cjs.Ease.quadInOut)
        .wait(1)
    );

    // he_head
    this.instance_2 = new lib.hehead("synched", 0);
    this.instance_2.setTransform(1.6, 62.35);

    this.timeline.addTween(
      cjs.Tween.get(this.instance_2)
        .to({ y: 62.9 }, 127, cjs.Ease.quadInOut)
        .to({ y: 61.55 }, 5, cjs.Ease.cubicInOut)
        .to({ y: 62.35 }, 61, cjs.Ease.quadInOut)
        .wait(1)
    );

    // he_body
    this.instance_3 = new lib.hebody("synched", 0);
    this.instance_3.setTransform(-4.05, 134.25);

    this.timeline.addTween(
      cjs.Tween.get(this.instance_3)
        .to({ x: -5.05, y: 132.9 }, 127, cjs.Ease.cubicInOut)
        .to({ x: -4.05, y: 134.25 }, 66, cjs.Ease.cubicInOut)
        .wait(1)
    );

    // helmet_back
    this.instance_4 = new lib.hehelmetback("synched", 0);
    this.instance_4.setTransform(0.1, 39.5);

    this.timeline.addTween(
      cjs.Tween.get(this.instance_4)
        .to({ y: 40.55 }, 127, cjs.Ease.quadInOut)
        .to({ y: 38.9 }, 5, cjs.Ease.cubicInOut)
        .to({ y: 39.2 }, 61, cjs.Ease.quadInOut)
        .wait(1)
    );

    // he_legs
    this.instance_5 = new lib.helegs("synched", 0);
    this.instance_5.setTransform(-2.25, 185.8);

    this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(194));

    // he_arm_R
    this.instance_6 = new lib.hearm_R("synched", 0);
    this.instance_6.setTransform(-43.25, 140.6);

    this.timeline.addTween(
      cjs.Tween.get(this.instance_6)
        .to({ y: 138.85 }, 127, cjs.Ease.cubicInOut)
        .to({ y: 140.6 }, 66, cjs.Ease.cubicInOut)
        .wait(1)
    );

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-69.1, -46.4, 138.5, 274);

  (lib.ClipGroup_5 = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // hero_Bricks_back_reflect_svg
    this.instance_5 = new lib.ClipGroup_4();
    this.instance_5.setTransform(1220.7, 1328.5, 1, 1, 0, 0, 0, 1220.7, 1328.5);

    this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(1));

    this._renderFirstFrame();
  }).prototype = getMCSymbolPrototype(
    lib.ClipGroup_5,
    new cjs.Rectangle(-261.8, 0, 2965, 2657),
    null
  );

  (lib.MascotsinETHlogo = function (mode, startPosition, loop, reversed) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // she_arm_top
    this.instance = new lib.shearmRtop("synched", 0);
    this.instance.setTransform(61.4, 300.15, 1, 1, 0, 0, 0, 8.5, -13.3);

    this.timeline.addTween(
      cjs.Tween.get(this.instance)
        .to({ x: 60.6, y: 300.75 }, 90, cjs.Ease.cubicInOut)
        .wait(1)
        .to({ regX: 2.8, regY: 0.3, x: 54.9, y: 314.3 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ x: 54.95 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 314.25 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ x: 55 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 314.2 }, 0)
        .wait(1)
        .to({ x: 55.05 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ x: 55.1, y: 314.15 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ x: 55.15 }, 0)
        .wait(1)
        .to({ y: 314.1 }, 0)
        .wait(1)
        .to({ x: 55.2 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 314.05 }, 0)
        .wait(1)
        .to({ x: 55.25 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ x: 55.3, y: 314 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ x: 55.35 }, 0)
        .wait(1)
        .to({ y: 313.95 }, 0)
        .wait(1)
        .to({ x: 55.4 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 313.9 }, 0)
        .wait(1)
        .to({ x: 55.45 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ x: 55.5, y: 313.85 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ x: 55.55 }, 0)
        .wait(1)
        .to({ y: 313.8 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ x: 55.6 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 313.75 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ x: 55.65 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ regX: 8.5, regY: -13.3, x: 61.4, y: 300.15 }, 0)
        .to({ _off: true }, 1)
        .wait(3)
    );

    // he_arm_top
    this.instance_1 = new lib.hearmL("synched", 0);
    this.instance_1.setTransform(275.55, 312);

    this.timeline.addTween(
      cjs.Tween.get(this.instance_1)
        .to({ y: 310 }, 74, cjs.Ease.cubicInOut)
        .wait(1)
        .to({ regX: -5.5, regY: 8.5, x: 270.05, y: 318.5 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 318.55 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 318.6 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 318.65 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 318.7 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 318.75 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 318.8 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 318.85 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 318.9 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 318.95 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 319 }, 0)
        .wait(1)
        .to({ y: 319.05 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 319.1 }, 0)
        .wait(1)
        .to({ y: 319.15 }, 0)
        .wait(1)
        .to({ y: 319.2 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 319.25 }, 0)
        .wait(1)
        .to({ y: 319.3 }, 0)
        .wait(1)
        .to({ y: 319.35 }, 0)
        .wait(1)
        .to({ y: 319.4 }, 0)
        .wait(1)
        .to({ y: 319.45 }, 0)
        .wait(1)
        .to({ y: 319.5 }, 0)
        .wait(1)
        .to({ y: 319.55 }, 0)
        .wait(1)
        .to({ y: 319.6 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 319.65 }, 0)
        .wait(1)
        .to({ y: 319.7 }, 0)
        .wait(1)
        .to({ y: 319.75 }, 0)
        .wait(1)
        .to({ y: 319.8 }, 0)
        .wait(1)
        .to({ y: 319.85 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 319.9 }, 0)
        .wait(1)
        .to({ y: 319.95 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 320 }, 0)
        .wait(1)
        .to({ y: 320.05 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 320.1 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 320.15 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 320.2 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 320.25 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 320.3 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 320.35 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 320.4 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ y: 320.45 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ startPosition: 0 }, 0)
        .wait(1)
        .to({ regX: 0, regY: 0, x: 275.55, y: 312 }, 0)
        .to({ _off: true }, 1)
        .wait(3)
    );

    // he_ETH_mask (mask)
    var mask = new cjs.Shape();
    mask._off = true;
    var mask_graphics_0 = new cjs.Graphics().p(
      "A3+PjMAA0gpnIXvgVIY9AAMgAcApzI4jPpgAAlBUIABgiIgBAAIAAgKg"
    );
    var mask_graphics_190 = new cjs.Graphics().p(
      "A3+PjMAA0gpnIXvgVIY9AAMgAcApzI4jPpgAAlBUIABgiIgBAAIAAgKg"
    );

    this.timeline.addTween(
      cjs.Tween.get(mask)
        .to({ graphics: mask_graphics_0, x: 163.375, y: 198.7 })
        .wait(190)
        .to({ graphics: mask_graphics_190, x: 163.375, y: 198.7 })
        .wait(1)
        .to({ graphics: null, x: 0, y: 0 })
        .wait(3)
    );

    // he
    this.instance_2 = new lib.mascothe("synched", 0);
    this.instance_2.setTransform(241.2, 171.35);

    var maskedShapeInstanceList = [this.instance_2];

    for (
      var shapedInstanceItr = 0;
      shapedInstanceItr < maskedShapeInstanceList.length;
      shapedInstanceItr++
    ) {
      maskedShapeInstanceList[shapedInstanceItr].mask = mask;
    }

    this.timeline.addTween(
      cjs.Tween.get(this.instance_2)
        .wait(190)
        .to({ startPosition: 190 }, 0)
        .to({ _off: true }, 1)
        .wait(3)
    );

    // ETH_mask (mask)
    var mask_1 = new cjs.Shape();
    mask_1._off = true;
    var mask_1_graphics_0 = new cjs.Graphics().p(
      "A3+PjMAA0gpnIXvgVIY9AAMgAcApzI4jPpgAAlBUIABgiIgBAAIAAgKg"
    );
    var mask_1_graphics_190 = new cjs.Graphics().p(
      "A3+PjMAA0gpnIXvgVIY9AAMgAcApzI4jPpgAAlBUIABgiIgBAAIAAgKg"
    );

    this.timeline.addTween(
      cjs.Tween.get(mask_1)
        .to({ graphics: mask_1_graphics_0, x: 163.375, y: 198.7 })
        .wait(190)
        .to({ graphics: mask_1_graphics_190, x: 163.375, y: 198.7 })
        .wait(1)
        .to({ graphics: null, x: 0, y: 0 })
        .wait(3)
    );

    // she
    this.instance_3 = new lib.she("synched", 0);
    this.instance_3.setTransform(68.5, 43.65, 1, 1, 0, 0, 0, 68, 53.7);

    var maskedShapeInstanceList = [this.instance_3];

    for (
      var shapedInstanceItr = 0;
      shapedInstanceItr < maskedShapeInstanceList.length;
      shapedInstanceItr++
    ) {
      maskedShapeInstanceList[shapedInstanceItr].mask = mask_1;
    }

    this.timeline.addTween(
      cjs.Tween.get(this.instance_3)
        .wait(190)
        .to({ startPosition: 190 }, 0)
        .to({ _off: true }, 1)
        .wait(3)
    );

    // ETH_logo
    this.instance_4 = new lib.ETH_logo("synched", 0);
    this.instance_4.setTransform(167.45, 284.8, 1, 1, 0, 0, 180);

    this.timeline.addTween(
      cjs.Tween.get(this.instance_4)
        .wait(190)
        .to({ startPosition: 0 }, 0)
        .to({ _off: true }, 1)
        .wait(3)
    );

    this._renderFirstFrame();
  }).prototype = p = new cjs.MovieClip();
  p.nominalBounds = new cjs.Rectangle(-0.1, 0, 335, 569.6);

  // stage content:
  (lib.Harhdatherov9reduccionpeso = function (
    mode,
    startPosition,
    loop,
    reversed,
    stage
  ) {
    if (loop == null) {
      loop = true;
    }
    if (reversed == null) {
      reversed = false;
    }
    var props = new Object();
    props.mode = mode;
    props.startPosition = startPosition;
    props.labels = {};
    props.loop = loop;
    props.reversed = reversed;
    cjs.MovieClip.apply(this, [props]);

    // mascots
    this.instance = new lib.MascotsinETHlogo("synched", 0);
    this.instance.setTransform(560.1, 317.8, 1, 1, 0, 0, 0, 167.5, 284.8);

    this.timeline.addTween(
      cjs.Tween.get(this.instance)
        .to({ y: 357.8, startPosition: 96 }, 96)
        .to({ y: 317.8, startPosition: 9 }, 95)
        .wait(2)
    );

    // shadow
    this.instance_1 = new lib.shadow("synched", 0);
    this.instance_1.setTransform(560.9, 643.95);

    this.timeline.addTween(
      cjs.Tween.get(this.instance_1)
        .to({ scaleX: 1.8889 }, 96, cjs.Ease.none)
        .to({ scaleX: 1 }, 95, cjs.Ease.none)
        .wait(2)
    );

    // gradient
    this.shape = new cjs.Shape();
    this.shape.graphics
      .f()
      .s("rgba(255,255,255,0.039)")
      .ss(1, 1, 1)
      .p("EgtMg2KMBaZAAAMAAABsVMhaZAAAg");
    this.shape.setTransform(597.65, 346.675);

    this.shape_1 = new cjs.Shape();
    this.shape_1.graphics
      .lf(
        ["#FFFFFF", "rgba(255,255,255,0)"],
        [0, 1],
        -226.4,
        61.2,
        225.3,
        -60.1
      )
      .s()
      .p("EgtLA2LMAAAhsVMBaXAAAMAAABsVg");
    this.shape_1.setTransform(597.65, 346.675);

    this.timeline.addTween(
      cjs.Tween.get({})
        .to({ state: [{ t: this.shape_1 }, { t: this.shape }] })
        .wait(193)
    );

    // bricks_reflect_masl (mask)
    var mask = new cjs.Shape();
    mask._off = true;
    var mask_graphics_0 = new cjs.Graphics().p("EgwHhENIKBlyMBWOCVXIqBFxg");
    var mask_graphics_18 = new cjs.Graphics().p("EgwHhENIKBlyMBWOCVXIqBFxg");
    var mask_graphics_19 = new cjs.Graphics().p("EgwHhFfIKBlyMBWOCVXIqBFyg");
    var mask_graphics_20 = new cjs.Graphics().p("EgwHhGxIKBlyMBWOCVXIqBFyg");
    var mask_graphics_21 = new cjs.Graphics().p("EgwHhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_22 = new cjs.Graphics().p("EgwHhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_23 = new cjs.Graphics().p("EgwHhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_24 = new cjs.Graphics().p("EgvvhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_25 = new cjs.Graphics().p("Egt1hHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_26 = new cjs.Graphics().p("Egr8hHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_27 = new cjs.Graphics().p("EgqDhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_28 = new cjs.Graphics().p("EgoKhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_29 = new cjs.Graphics().p("EgmQhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_30 = new cjs.Graphics().p("EgkXhHyIKBlyMBWPCVXIqCFyg");
    var mask_graphics_31 = new cjs.Graphics().p("EgiehHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_32 = new cjs.Graphics().p("EggkhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_33 = new cjs.Graphics().p("EgerhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_34 = new cjs.Graphics().p("EgcyhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_35 = new cjs.Graphics().p("Ega5hHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_36 = new cjs.Graphics().p("EgY/hHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_37 = new cjs.Graphics().p("EgXGhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_38 = new cjs.Graphics().p("EgVNhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_39 = new cjs.Graphics().p("EgTUhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_40 = new cjs.Graphics().p("EgRahHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_41 = new cjs.Graphics().p("EgPhhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_42 = new cjs.Graphics().p("EgNohHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_43 = new cjs.Graphics().p("EgLuhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_44 = new cjs.Graphics().p("EgJ1hHyIKAlyMBWPCVXIqBFyg");
    var mask_graphics_45 = new cjs.Graphics().p("EgH8hHyIKAlyMBWQCVXIqBFyg");
    var mask_graphics_46 = new cjs.Graphics().p("EgGDhHyIKAlyMBWQCVXIqBFyg");
    var mask_graphics_47 = new cjs.Graphics().p("EgEJhHyIKAlyMBWPCVXIqBFyg");
    var mask_graphics_48 = new cjs.Graphics().p("EgCQhHyIKAlyMBWPCVXIqBFyg");
    var mask_graphics_49 = new cjs.Graphics().p("EgAXhHyIKAlyMBWQCVXIqBFyg");
    var mask_graphics_50 = new cjs.Graphics().p("EABhhHyIKBlyMBWQCVXIqBFyg");
    var mask_graphics_51 = new cjs.Graphics().p("EADbhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_52 = new cjs.Graphics().p("EAFUhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_53 = new cjs.Graphics().p("EAHNhHyIKBlyMBWQCVXIqBFyg");
    var mask_graphics_54 = new cjs.Graphics().p("EAJGhHyIKClyMBWPCVXIqBFyg");
    var mask_graphics_99 = new cjs.Graphics().p("EAJphHyIKBlyMBWQCVXIqBFyg");
    var mask_graphics_100 = new cjs.Graphics().p("EAHohHyIKBlyMBWQCVXIqBFyg");
    var mask_graphics_101 = new cjs.Graphics().p("EAFnhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_102 = new cjs.Graphics().p("EADlhHyIKBlyMBWQCVXIqBFyg");
    var mask_graphics_103 = new cjs.Graphics().p("EABkhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_104 = new cjs.Graphics().p("EgAdhHyIKAlyMBWQCVXIqBFyg");
    var mask_graphics_105 = new cjs.Graphics().p("EgCehHyIKAlyMBWPCVXIqBFyg");
    var mask_graphics_106 = new cjs.Graphics().p("EgEghHyIKAlyMBWQCVXIqBFyg");
    var mask_graphics_107 = new cjs.Graphics().p("EgGhhHyIKAlyMBWQCVXIqBFyg");
    var mask_graphics_108 = new cjs.Graphics().p("EgIihHyIKAlyMBWPCVXIqBFyg");
    var mask_graphics_109 = new cjs.Graphics().p("EgKkhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_110 = new cjs.Graphics().p("EgMlhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_111 = new cjs.Graphics().p("EgOnhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_112 = new cjs.Graphics().p("EgQohHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_113 = new cjs.Graphics().p("EgSqhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_114 = new cjs.Graphics().p("EgUrhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_115 = new cjs.Graphics().p("EgWshHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_116 = new cjs.Graphics().p("EgYuhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_117 = new cjs.Graphics().p("EgavhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_118 = new cjs.Graphics().p("EgcxhHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_119 = new cjs.Graphics().p("EgeyhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_120 = new cjs.Graphics().p("Egg0hHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_121 = new cjs.Graphics().p("Egi1hHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_122 = new cjs.Graphics().p("Egk2hHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_123 = new cjs.Graphics().p("Egm4hHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_124 = new cjs.Graphics().p("Ego5hHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_125 = new cjs.Graphics().p("Egq7hHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_126 = new cjs.Graphics().p("Egs8hHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_127 = new cjs.Graphics().p("Egu+hHyIKBlyMBWPCVXIqBFyg");
    var mask_graphics_128 = new cjs.Graphics().p("EgwHhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_129 = new cjs.Graphics().p("EgwHhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_130 = new cjs.Graphics().p("EgwHhHyIKBlyMBWOCVXIqBFyg");
    var mask_graphics_131 = new cjs.Graphics().p("EgwHhG/IKBlyMBWOCVXIqBFyg");
    var mask_graphics_132 = new cjs.Graphics().p("EgwHhFmIKBlyMBWOCVXIqBFyg");
    var mask_graphics_133 = new cjs.Graphics().p("EgwHhENIKBlyMBWOCVXIqBFxg");

    this.timeline.addTween(
      cjs.Tween.get(mask)
        .to({ graphics: mask_graphics_0, x: 167.425, y: 519.35 })
        .wait(18)
        .to({ graphics: mask_graphics_18, x: 167.425, y: 519.35 })
        .wait(1)
        .to({ graphics: mask_graphics_19, x: 191.6792, y: 511.1958 })
        .wait(1)
        .to({ graphics: mask_graphics_20, x: 215.9333, y: 503.0417 })
        .wait(1)
        .to({ graphics: mask_graphics_21, x: 240.1875, y: 493.275 })
        .wait(1)
        .to({ graphics: mask_graphics_22, x: 264.4417, y: 476.9667 })
        .wait(1)
        .to({ graphics: mask_graphics_23, x: 288.6958, y: 460.6583 })
        .wait(1)
        .to({ graphics: mask_graphics_24, x: 310.4875, y: 444.35 })
        .wait(1)
        .to({ graphics: mask_graphics_25, x: 322.6146, y: 428.0417 })
        .wait(1)
        .to({ graphics: mask_graphics_26, x: 334.7417, y: 411.7333 })
        .wait(1)
        .to({ graphics: mask_graphics_27, x: 346.8688, y: 395.425 })
        .wait(1)
        .to({ graphics: mask_graphics_28, x: 358.9958, y: 379.1167 })
        .wait(1)
        .to({ graphics: mask_graphics_29, x: 371.1229, y: 362.8083 })
        .wait(1)
        .to({ graphics: mask_graphics_30, x: 383.25, y: 346.5 })
        .wait(1)
        .to({ graphics: mask_graphics_31, x: 395.3771, y: 330.1917 })
        .wait(1)
        .to({ graphics: mask_graphics_32, x: 407.5042, y: 313.8833 })
        .wait(1)
        .to({ graphics: mask_graphics_33, x: 419.6313, y: 297.575 })
        .wait(1)
        .to({ graphics: mask_graphics_34, x: 431.7583, y: 281.2667 })
        .wait(1)
        .to({ graphics: mask_graphics_35, x: 443.8854, y: 264.9583 })
        .wait(1)
        .to({ graphics: mask_graphics_36, x: 456.0125, y: 248.65 })
        .wait(1)
        .to({ graphics: mask_graphics_37, x: 468.1396, y: 232.3417 })
        .wait(1)
        .to({ graphics: mask_graphics_38, x: 480.2667, y: 216.0333 })
        .wait(1)
        .to({ graphics: mask_graphics_39, x: 492.3938, y: 199.725 })
        .wait(1)
        .to({ graphics: mask_graphics_40, x: 504.5208, y: 183.4167 })
        .wait(1)
        .to({ graphics: mask_graphics_41, x: 516.6479, y: 167.1083 })
        .wait(1)
        .to({ graphics: mask_graphics_42, x: 528.775, y: 150.8 })
        .wait(1)
        .to({ graphics: mask_graphics_43, x: 540.9021, y: 134.4917 })
        .wait(1)
        .to({ graphics: mask_graphics_44, x: 553.0292, y: 118.1833 })
        .wait(1)
        .to({ graphics: mask_graphics_45, x: 565.1563, y: 101.875 })
        .wait(1)
        .to({ graphics: mask_graphics_46, x: 577.2833, y: 85.5667 })
        .wait(1)
        .to({ graphics: mask_graphics_47, x: 589.4104, y: 69.2583 })
        .wait(1)
        .to({ graphics: mask_graphics_48, x: 601.5375, y: 52.95 })
        .wait(1)
        .to({ graphics: mask_graphics_49, x: 613.6646, y: 36.6417 })
        .wait(1)
        .to({ graphics: mask_graphics_50, x: 625.7917, y: 20.3333 })
        .wait(1)
        .to({ graphics: mask_graphics_51, x: 637.9188, y: 4.025 })
        .wait(1)
        .to({ graphics: mask_graphics_52, x: 650.0458, y: -12.2833 })
        .wait(1)
        .to({ graphics: mask_graphics_53, x: 662.1729, y: -28.5917 })
        .wait(1)
        .to({ graphics: mask_graphics_54, x: 674.3, y: -44.9 })
        .wait(45)
        .to({ graphics: mask_graphics_99, x: 677.8, y: -61.9 })
        .wait(1)
        .to({ graphics: mask_graphics_100, x: 664.8566, y: -44.1324 })
        .wait(1)
        .to({ graphics: mask_graphics_101, x: 651.9132, y: -26.3647 })
        .wait(1)
        .to({ graphics: mask_graphics_102, x: 638.9699, y: -8.5971 })
        .wait(1)
        .to({ graphics: mask_graphics_103, x: 626.0265, y: 9.1706 })
        .wait(1)
        .to({ graphics: mask_graphics_104, x: 613.0831, y: 26.9382 })
        .wait(1)
        .to({ graphics: mask_graphics_105, x: 600.1397, y: 44.7059 })
        .wait(1)
        .to({ graphics: mask_graphics_106, x: 587.1963, y: 62.4735 })
        .wait(1)
        .to({ graphics: mask_graphics_107, x: 574.2529, y: 80.2412 })
        .wait(1)
        .to({ graphics: mask_graphics_108, x: 561.3096, y: 98.0088 })
        .wait(1)
        .to({ graphics: mask_graphics_109, x: 548.3662, y: 115.7765 })
        .wait(1)
        .to({ graphics: mask_graphics_110, x: 535.4228, y: 133.5441 })
        .wait(1)
        .to({ graphics: mask_graphics_111, x: 522.4794, y: 151.3118 })
        .wait(1)
        .to({ graphics: mask_graphics_112, x: 509.536, y: 169.0794 })
        .wait(1)
        .to({ graphics: mask_graphics_113, x: 496.5926, y: 186.8471 })
        .wait(1)
        .to({ graphics: mask_graphics_114, x: 483.6493, y: 204.6147 })
        .wait(1)
        .to({ graphics: mask_graphics_115, x: 470.7059, y: 222.3824 })
        .wait(1)
        .to({ graphics: mask_graphics_116, x: 457.7625, y: 240.15 })
        .wait(1)
        .to({ graphics: mask_graphics_117, x: 444.8191, y: 257.9176 })
        .wait(1)
        .to({ graphics: mask_graphics_118, x: 431.8757, y: 275.6853 })
        .wait(1)
        .to({ graphics: mask_graphics_119, x: 418.9324, y: 293.4529 })
        .wait(1)
        .to({ graphics: mask_graphics_120, x: 405.989, y: 311.2206 })
        .wait(1)
        .to({ graphics: mask_graphics_121, x: 393.0456, y: 328.9882 })
        .wait(1)
        .to({ graphics: mask_graphics_122, x: 380.1022, y: 346.7559 })
        .wait(1)
        .to({ graphics: mask_graphics_123, x: 367.1588, y: 364.5235 })
        .wait(1)
        .to({ graphics: mask_graphics_124, x: 354.2154, y: 382.2912 })
        .wait(1)
        .to({ graphics: mask_graphics_125, x: 341.2721, y: 400.0588 })
        .wait(1)
        .to({ graphics: mask_graphics_126, x: 328.3287, y: 417.8265 })
        .wait(1)
        .to({ graphics: mask_graphics_127, x: 315.3853, y: 435.5941 })
        .wait(1)
        .to({ graphics: mask_graphics_128, x: 296.8588, y: 453.3618 })
        .wait(1)
        .to({ graphics: mask_graphics_129, x: 270.9721, y: 471.1294 })
        .wait(1)
        .to({ graphics: mask_graphics_130, x: 245.0853, y: 488.8971 })
        .wait(1)
        .to({ graphics: mask_graphics_131, x: 219.1985, y: 501.5824 })
        .wait(1)
        .to({ graphics: mask_graphics_132, x: 193.3118, y: 510.4662 })
        .wait(1)
        .to({ graphics: mask_graphics_133, x: 167.425, y: 519.35 })
        .wait(60)
    );

    // reflect
    this.instance_2 = new lib.ClipGroup_5();
    this.instance_2.setTransform(-342, 1231.45, 1, 1, 0, 0, 0, 1220.7, 1328.5);
    this.instance_2.alpha = 0.3906;

    var maskedShapeInstanceList = [this.instance_2];

    for (
      var shapedInstanceItr = 0;
      shapedInstanceItr < maskedShapeInstanceList.length;
      shapedInstanceItr++
    ) {
      maskedShapeInstanceList[shapedInstanceItr].mask = mask;
    }

    this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(193));

    // hero_Bricks_back_svg
    this.instance_3 = new lib.ClipGroup_3();
    this.instance_3.setTransform(605.9, 346.7, 1, 1, 0, 0, 0, 290.5, 346.7);

    this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(193));

    this._renderFirstFrame();
  }).prototype = p = new lib.AnMovieClip();
  p.nominalBounds = new cjs.Rectangle(419.4, 249.5, 721.1, 789.2);
  // library properties:
  lib.properties = {
    id: "36A1779EF9C24DC9B80C7DE50F290651",
    width: 1120,
    height: 693,
    fps: 24,
    color: "#FFFFFF",
    opacity: 1.0,
    manifest: [
      // [MODIFIED]: Replaced the src properties. They used to have string,
      // now they have the improted urls.
      { src: CachedBmp, id: "CachedBmp_9" },
      { src: HardhatHeroAtlas1, id: "Harhdat_hero_atlas_1" },
      { src: HardhatHeroAtlas2, id: "Harhdat_hero_atlas_2" },
    ],
    preloads: [],
  };

  // bootstrap callback support:

  (lib.Stage = function (canvas) {
    createjs.Stage.call(this, canvas);
  }).prototype = p = new createjs.Stage();

  p.setAutoPlay = function (autoPlay) {
    this.tickEnabled = autoPlay;
  };
  p.play = function () {
    this.tickEnabled = true;
    this.getChildAt(0).gotoAndPlay(this.getTimelinePosition());
  };
  p.stop = function (ms) {
    if (ms) this.seek(ms);
    this.tickEnabled = false;
  };
  p.seek = function (ms) {
    this.tickEnabled = true;
    this.getChildAt(0).gotoAndStop((lib.properties.fps * ms) / 1000);
  };
  p.getDuration = function () {
    return (this.getChildAt(0).totalFrames / lib.properties.fps) * 1000;
  };

  p.getTimelinePosition = function () {
    return (this.getChildAt(0).currentFrame / lib.properties.fps) * 1000;
  };

  an.bootcompsLoaded = an.bootcompsLoaded || [];
  if (!an.bootstrapListeners) {
    an.bootstrapListeners = [];
  }

  an.bootstrapCallback = function (fnCallback) {
    an.bootstrapListeners.push(fnCallback);
    if (an.bootcompsLoaded.length > 0) {
      for (var i = 0; i < an.bootcompsLoaded.length; ++i) {
        fnCallback(an.bootcompsLoaded[i]);
      }
    }
  };

  an.compositions = an.compositions || {};
  an.compositions["36A1779EF9C24DC9B80C7DE50F290651"] = {
    getStage: function () {
      return exportRoot.stage;
    },
    getLibrary: function () {
      return lib;
    },
    getSpriteSheet: function () {
      return ss;
    },
    getImages: function () {
      return img;
    },
  };

  an.compositionLoaded = function (id) {
    an.bootcompsLoaded.push(id);
    for (var j = 0; j < an.bootstrapListeners.length; j++) {
      an.bootstrapListeners[j](id);
    }
  };

  an.getComposition = function (id) {
    return an.compositions[id];
  };

  an.makeResponsive = function (
    isResp,
    respDim,
    isScale,
    scaleType,
    domContainers,
    stage
  ) {
    var lastW,
      lastH,
      lastS = 1;
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    function resizeCanvas() {
      var w = lib.properties.width,
        h = lib.properties.height;
      var iw = window.innerWidth,
        ih = window.innerHeight;
      var pRatio = window.devicePixelRatio || 1,
        xRatio = iw / w,
        yRatio = ih / h,
        sRatio = 1;
      if (isResp) {
        if (
          (respDim == "width" && lastW == iw) ||
          (respDim == "height" && lastH == ih)
        ) {
          sRatio = lastS;
        } else if (!isScale) {
          if (iw < w || ih < h) sRatio = Math.min(xRatio, yRatio);
        } else if (scaleType == 1) {
          sRatio = Math.min(xRatio, yRatio);
        } else if (scaleType == 2) {
          sRatio = Math.max(xRatio, yRatio);
        }
      }
      domContainers[0].width = w * pRatio * sRatio;
      domContainers[0].height = h * pRatio * sRatio;
      domContainers.forEach(function (container) {
        container.style.width = w * sRatio + "px";
        container.style.height = h * sRatio + "px";
      });
      stage.scaleX = pRatio * sRatio;
      stage.scaleY = pRatio * sRatio;
      lastW = iw;
      lastH = ih;
      lastS = sRatio;
      stage.tickOnUpdate = false;
      stage.update();
      stage.tickOnUpdate = true;
    }

    // [MODIFIED]: Added this return statement
    return resizeCanvas;
  };
  an.handleSoundStreamOnTick = function (event) {
    if (!event.paused) {
      var stageChild = stage.getChildAt(0);
      if (!stageChild.paused) {
        stageChild.syncStreamSounds();
      }
    }
  };
  // [MODIFIED]: Changed the params
})(window.createjs, window.AdobeAn);
