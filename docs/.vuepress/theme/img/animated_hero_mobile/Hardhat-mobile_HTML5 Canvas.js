// [MODIFIED]: Added this definition
window.AdobeAn = window.AdobeAn || {};

(function (cjs, an) {
	// console.log(an)

var p; // shortcut to reference prototypes
var lib={};
var ss={};
var img={};
lib.ssMetadata = [];
(lib.AnMovieClip = function(){
	this.actionFrames = [];
	this.ignorePause = false;
	this.gotoAndPlay = function(positionOrLabel){
		cjs.MovieClip.prototype.gotoAndPlay.call(this,positionOrLabel);
	}
	this.play = function(){
		cjs.MovieClip.prototype.play.call(this);
	}
	this.gotoAndStop = function(positionOrLabel){
		cjs.MovieClip.prototype.gotoAndStop.call(this,positionOrLabel);
	}
	this.stop = function(){
		cjs.MovieClip.prototype.stop.call(this);
	}
}).prototype = p = new cjs.MovieClip();
// symbols:
// helper functions:

function mc_symbol_clone() {
	var clone = this._cloneProps(new this.constructor(this.mode, this.startPosition, this.loop, this.reversed));
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


(lib.Tween15 = function(
	mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#262223").s().p("AnoBPQjKgaAAgkIAAhCQDSgfBwgKQCqgNDGAAQDIAACpANQBGAGCFAYIB3AXIAAA2QAAAkjLAaQjLAZkdAAQkeAAjKgZg");
	this.shape.setTransform(-0.0576,-0.0268,0.8445,0.7914,0,4.7648,4.18);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-58.3,-9.4,116.69999999999999,18.9);


(lib.Tween14 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#262223").s().p("AnoBPQjKgaAAgkIAAhCQDSgfBwgKQCqgNDGAAQDIAACpANQBGAGCFAYIB3AXIAAA2QAAAkjLAaQjLAZkdAAQkeAAjKgZg");
	this.shape.setTransform(-0.0565,-0.0265,0.8445,0.7914,0,4.7647,4.1799);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-58.3,-9.4,116.69999999999999,18.9);


(lib.Tween6 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#EDD131").s().p("AhpATIAGglQBuAHBggHQgCAXgEAOg");
	this.shape.setTransform(19.5033,20.5517,1.0931,1.0931);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#EDD131").s().p("AB0AtQiTgPiVgcQAGgYAHgWQCfAkCgAMIAdACIgHAng");
	this.shape_1.setTransform(-12.2797,17.7642,1.0931,1.0931);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#AE9A41").s().p("AgRCeIAIgrIAHgyIAEgpQADgeABgTIABgUQACg7gFgkIAAgDIgBgOIALAMIABgBQAGA2gEBEQAAAmgJAzQgDAZgFAaIgGAqg");
	this.shape_2.setTransform(8.5464,6.875);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.lf(["#E8A03F","#E77D42"],[0,1],-38.5,0,53.9,0).s().p("AB6ApQiYgMiGgeQAKgUAPgWQCQAgChAKQgBAQgDAdIgogDg");
	this.shape_3.setTransform(-8.973,4.5372,1.0931,1.0931);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.lf(["#E8A03F","#E77D42"],[0,1],-11.6,0,80.3,0).s().p("AhfAWIAEgtQBxAHBIgJIgCALIAEAjQgnAFg0AAQgsAAg4gEg");
	this.shape_4.setTransform(20.2958,6.9704,1.0931,1.0931);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.lf(["#E8A03F","#E77D42"],[0,1],-39.7,0,53.3,0).s().p("ACOAtQiggNifgiQAHgVAKgXQCpAlCpAKQgDAXgEAXg");
	this.shape_5.setTransform(-11.2139,13.2277,1.0931,1.0931);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.lf(["#E8A03F","#E77D42"],[0,1],-10.7,0,82.6,0).s().p("AhmAVQAEgWADgXQBrAHBbgHQABAWgBAYQguADgyAAQg0AAg5gEg");
	this.shape_6.setTransform(19.8804,16.1452,1.0931,1.0931);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#EDD131").s().p("AhiARIAEgjQB3AGBIgIIADAlQguAEgyAAQgwAAg2gEg");
	this.shape_7.setTransform(20.2138,11.5606,1.0931,1.0931);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.f("#EDD131").s().p("AhpB6QAEg+gFgxQAYgqACgvQA6gQA0geQA7A2ASB0QABAHgLAbIgRAoQgnAFgzAAQgrAAg0gDg");
	this.shape_8.setTransform(21.7761,-8.9543,1.0931,1.0931);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.f("#EDD131").s().p("AiZBBIAFgHQAdgEAZgxQAbg1gLg5QATANA4AJQA2AJAqgEQAaAgAfAhIgBAAIACAMIAAACQAEAmgCAxIgBASQifgKiSgfg");
	this.shape_9.setTransform(-7.5295,-7.3234,1.0931,1.0931);

	this.shape_10 = new cjs.Shape();
	this.shape_10.graphics.f("#EDD131").s().p("AirgGQAIgTAJgPQCGAfCYALIAoACIgEAlQiogLirgkg");
	this.shape_10.setTransform(-10.0661,8.8551,1.0931,1.0931);

	this.shape_11 = new cjs.Shape();
	this.shape_11.graphics.f("#F2EDDD").s().p("Ak6DaQACgZAYgyIAkhJQAYgxAMg2QALg6gPgNQgFgFgRgCQgZgFgeAHQghAIAjgrQAeglAqgiQBBAjBLAKQBCAJBSgJQA9gGBwgpQAkAnAWA2QAUAygCAhQgHBBgBDCg");
	this.shape_11.setTransform(-1.8911,0.875);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_11},{t:this.shape_10},{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-33.3,-22.6,66.8,45.3);


(lib.Tween4 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF8F66").s().p("AAmBEQAAgSgXgRQgSgOgdgKQgbgJgCgcQgBgdAagLQAbgMAZALQAaAKALATQAJASAAAgQAAAkgYAdg");
	this.shape.setTransform(-41.604,10.405);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFFFFF").s().p("Ag9ASQgagZgBgkICxAAQAAAkgaAZQgaAaglAAQgkAAgZgag");
	this.shape_1.setTransform(7.325,37.125);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.lf(["#4F00A3","#23004E"],[0,1],-0.2,26.9,-0.1,-14.9).s().p("ACCD6IAAhlQgNASgQAQQggAggpARQgpASguAAIjgAAQgTgighgTQgigUgnAAIgDAAQgnAAgjATQghAVgTAhIgvAAIAAlzILKhaIHHgmIgmEUQAABlhKA+QhGA8hqAAg");
	this.shape_2.setTransform(0.025,-22.7);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#FF8F66").s().p("AjpDKQhKgWhAgsIAAjVQAAg8AqgrQArgqA8AAIInAAIApAAQAIAngDA6QgBAdgEAVQgyCJh8BRQh5BQiZAAIgJAAQhIAAhGgVg");
	this.shape_3.setTransform(10.0159,31.3797);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.lf(["#FB7E51","#FF8F66"],[0,1],0,2.7,0,53.7).s().p("AkFHMQh6hPgxiLQg4gFglgqQgmgqAAg4IAAgDQABgyAggnQAfgmAxgNQAijICBiNQCGiVCmAAQCoAACICYQCBCSAgDKQA3AZAVA5QAVA5gZA4QgNAbgYAVQgYAUgdAKQgwCNh7BRQh3BOidAAQibAAh3hNg");
	this.shape_4.setTransform(0.5739,0);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

	// Layer_1
	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#F3946F").s().p("AAmBEQAAgSgXgRQgSgOgdgKQgbgJgCgcQgBgdAagLQAbgMAZALQAaAKALATQAJASAAAgQAAAkgYAdg");
	this.shape_5.setTransform(-41.604,10.405);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#FFFFFF").s().p("Ag9ASQgagZgBgkICxAAQAAAkgaAZQgaAaglAAQgkAAgZgag");
	this.shape_6.setTransform(7.325,37.125);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.lf(["#4F00A3","#23004E"],[0,1],-1.7,33,-1.6,-15).s().p("ACCGRIAAhlQgNASgQAQQggAggpARQgpASguAAIjgAAQgTgighgTQgigUgnAAIgDAAQgnAAgjATQghAVgTAhIgvAAIAAl0QBKmDJsgqQFeBQB9DeIgmEUQAABlhKA+QhGA8hqAAg");
	this.shape_7.setTransform(0.025,-37.8);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.f("#F3946F").s().p("AjpDKQhKgWhAgsIAAjVQAAg8AqgrQArgqA8AAIInAAIApAAQAIAngDA6QgBAdgEAVQgyCJh8BRQh5BQiZAAIgJAAQhIAAhGgVg");
	this.shape_8.setTransform(10.0159,31.3797);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.lf(["#EA8058","#F3946F"],[0,1],0,2.7,0,53.7).s().p("AkFHNQh6hPgxiMQg4gFglgqQgmgqAAg5IAAgCQABgyAggoQAfgmAxgMQAijHCBiOQCGiVCmAAQCoAACICZQCBCRAgDKQA3AaAVA4QAVA5gZA3QgNAcgYAVQgYAVgdAJQgwCOh7BQQh3BOidAAQibAAh3hMg");
	this.shape_9.setTransform(0.5739,0);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5}]}).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-58.4,-77.9,116.9,131.60000000000002);


(lib.sheheadback = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.shape = new cjs.Shape();
	this.shape.graphics.lf(["#4F00A3","#23004E"],[0,1],0,-34.8,0,48.8).s().p("AlQIBQhUgBg8g7Qg7g8AAhUIAAs1IQ3AAIAAQBg");
	this.shape.setTransform(0,5);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-54,-46.2,108,102.5);


(lib.sheeyes = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#262223").s().p("AgvBKQgTgTAAgcIAAg1QAAgbATgUQAUgUAbgBIAAABIAAAAQAcAAAUAUQATAUAAAbIAAA1QAAAcgUATQgTAVgcAAQgbAAgUgVg");
	this.shape.setTransform(14.85,0);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#262223").s().p("AguBKQgTgTAAgcIAAg1QAAgbATgUQATgUAbgBIAAABIAAAAQAcAAATAUQAUAUgBAbIAAA1QABAcgUATQgTAVgcAAQgbAAgTgVg");
	this.shape_1.setTransform(-14.8744,0);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.sheeyes, new cjs.Rectangle(-21.5,-9.5,43,19), null);


(lib.she_helmet = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#4B4D4D").s().p("AhHicICPDnIiPBTg");
	this.shape.setTransform(16.625,-8.4);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#0A0A0A").s().p("AhHBLICPjnIAAE6g");
	this.shape_1.setTransform(2.275,-8.4);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#0A0A0A").s().p("AhHhkICPBYIAAByg");
	this.shape_2.setTransform(2.275,14.45);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#F9C838").s().p("AhHAAICPhSIAAClg");
	this.shape_3.setTransform(2.275,-0.925);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#4B4D4D").s().p("AhHgMICOhYIiODKg");
	this.shape_4.setTransform(16.6,14.45);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#F9C838").s().p("AhHhSICPBSIiPBTg");
	this.shape_5.setTransform(16.625,-0.925);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#F9C838").s().p("ABIhzIAACVIiPBSg");
	this.shape_6.setTransform(2.275,-12.55);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#F9C838").s().p("AhHAiIAAiVICPDng");
	this.shape_7.setTransform(16.625,-12.55);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.f("#F9C838").s().p("AhHgMICOhYIiODKg");
	this.shape_8.setTransform(16.6,14.45);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.f("#F9C838").s().p("AhHhkICPBYIAAByg");
	this.shape_9.setTransform(2.275,14.45);

	this.shape_10 = new cjs.Shape();
	this.shape_10.graphics.f("#FFF100").s().p("Aj4CbIAoj2QACgOAJgKQAJgKANgEQBWgZBZAAQBaAABWAZQANAEAJAKQAKAKACAOIAnD2g");
	this.shape_10.setTransform(0.075,-30.125);

	this.shape_11 = new cjs.Shape();
	this.shape_11.graphics.f("#FFF100").s().p("ADUFDQiQgKigAAIgmAAQihACiaALIgBg0QAAiqAniZQAmiWBFhvQC5hCC8A1QC+A0B9CYQA9DAgCDKQAAAkgCAkQhfgPiKgJg");
	this.shape_11.setTransform(9.1799,-6.738);

	this.shape_12 = new cjs.Shape();
	this.shape_12.graphics.lf(["#FFF100","#F5D600"],[0,1],0,-22.6,0,22.7).s().p("AgNDgIAChIQABjIg8jBQBFBTAjBnQAlBkAABtIAABYQgsgMgogGg");
	this.shape_12.setTransform(55,5.55);

	this.shape_13 = new cjs.Shape();
	this.shape_13.graphics.lf(["#FFF100","#F5D600"],[0,1],0,-33.7,0,33.8).s().p("AjOD6QAAjGByihQBwihC7hDQhEBvgmCVQgnCaAACrIABAzQiwANhdAag");
	this.shape_13.setTransform(-41.65,-3.975);

	this.shape_14 = new cjs.Shape();
	this.shape_14.graphics.f("#FFF100").s().p("Ag4BsQhNAAg6guIg1gnQgggYgpAAIiAABQhYAJhTAUQgiAHgbAVQgDgDAAgJIAAhCQAAgiC7gZQC7gZEMgCIAmAAQEZAADIAZQDHAZAAAkIAABCQABAHgDAEIgEgDQgOgOgsgLQgugMgsgFQgcgFgbALQgbALgRAXQgVAbgfAPQgfAPgiAAg");
	this.shape_14.setTransform(0.0111,34.9);

	this.shape_15 = new cjs.Shape();
	this.shape_15.graphics.f("#FFF100").s().p("AqOA+QgRgKgFgTQgDgHAAgGIAAgCQAAgjDHgZQDHgaEZAAQEZAADHAaQDIAZAAAiIAAACQAAAVgOAOQgPAOgUAAIgNgCIgBAAQhUgXipgNQimgNjFAAQjEAAimANQipANhUAXIgDABQgGACgHAAQgMAAgMgHg");
	this.shape_15.setTransform(-0.05,30.9945);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_15},{t:this.shape_14},{t:this.shape_13},{t:this.shape_12},{t:this.shape_11},{t:this.shape_10},{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-68,-45.6,136.1,91.30000000000001);


(lib.hehelmet = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFF100").s().p("Ak7BuQgjAAgfgQQgfgPgVgcQgSgXgbgLQgbgLgdAFQgxAHgrALQgtANgOAOIgDACQgEgFABgHIAAhDQAAgkDLgaQDLgaEcAAIAnAAQERACC+AaQC+AaAAAiIAABDQACAHgFAEQgcgVgigHQhSgVhdgJIiCgBQgpAAghAZIg1AoQg8AuhNABg");
	this.shape.setTransform(0.0076,35.45);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFF100").s().p("AJ1BEIgDAAQhSgXivgPQipgNjIAAQjHAAipANQivAPhTAXIgBAAQgHABgGAAQgVAAgPgOQgPgPAAgVIAAgBQABgjDLgaQDLgaEdAAQEeAADKAaQDLAaAAAkIAAABIgDANQgFAUgRAKQgMAHgNAAQgGAAgHgCg");
	this.shape_1.setTransform(0,31.5195);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#4B4D4D").s().p("AhICDICRhZIiRDOgAhIj3ICSDsIgBgBIAAABIiRBTg");
	this.shape_2.setTransform(-2.35,0.225);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#0A0A0A").s().p("AhIAqICRBZIAAB1gAhIgLICRjsIAAFAg");
	this.shape_3.setTransform(-16.95,0.225);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#F9C838").s().p("AhIhmICRBZIAAB0g");
	this.shape_4.setTransform(-16.95,14.7);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#F9C838").s().p("AhIgNICRhZIiRDNg");
	this.shape_5.setTransform(-2.35,14.7);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#FFF100").s().p("Aj9CeIApj6QACgOAKgLQAIgKAOgEQBXgaBbAAQBbAABYAZQANAFAKAKQAJAKACAOIAoD7g");
	this.shape_6.setTransform(-0.15,-30.65);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#FFF100").s().p("AnGEYQgBjMA9jEQB/ibDBg1QDAg2C9BEQBFBxAnCXQAoCdAACtIgBA0QiKgLi2gBIgnAAQiiAAiTAJQiMAJhhAPQgDgpAAggg");
	this.shape_7.setTransform(-9.4268,-6.8577);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.lf(["#FFF100","#F5D600"],[0,1],0.1,-23.2,0.1,23.3).s().p("AhHCcQgBhuAmhnQAkhnBGhWQg9DGABDLQAAAlACAkQguAHgnAMg");
	this.shape_8.setTransform(-55.9753,5.575);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.lf(["#FFF100","#F5D600"],[0,1],0.1,-30.9,0.1,30.9).s().p("Ag/EwIAAg1QABisgoidQgmiXhFhxQC9BDBzCkQB0CkgBDJIAABZQhWgZi7gOg");
	this.shape_9.setTransform(42.3251,-4.075);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-69.1,-46.4,138.3,92.8);


(lib.hehead = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.shape = new cjs.Shape();
	this.shape.graphics.lf(["#4F00A3","#23004E"],[0,1],-5.1,23.8,-5.1,-22.6).s().p("AE6DnQhMgXgbgaQgQgQgNgTIAABlIn6AAQhqAAhGg7QhKg/AAhkIACkRIIEAiICAAGIH3BKQgHBNgJBMQgTCbgRAAIAYAPQgqgDgvAPQgzARgVAdQgigGgmgLg");
	this.shape.setTransform(-4.45,-26.875);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFFFFF").s().p("AAAAtQgkAAgbgbQgagZAAglICzAAQAAAlgaAZQgaAaglABg");
	this.shape_1.setTransform(-13.65,38.925);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FF8F66").s().p("Ag9AKQgBggAKgSQAKgUAbgLQAagKAaAMQAbAKgCAdQgBAegbAIQgeALgSAOQgXASABATIAAAHQgZgdAAgmg");
	this.shape_2.setTransform(44.8278,8.6924);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.lf(["#4F00A3","#23004E"],[0,1],16.6,53.3,1.9,-42.6).s().p("AGYFYIgBAAQgkgBgjAQQgcg6hJAAQgTAAgUAEQimijgbgHQgqgLgnACQgngBgqAHIgTAEIgBAAQgVAFgSACIgxAAQhCgEgigQQghgRgZgdQgVgYgdgSQgLgGgLgEIAAAAQgVgJgEgIQgGgMAKgeQAZhHBghWQBLhEBfgkQBegkBlAAQAYAAAdACIACABIAKgBIgZgCIAGAAQAKgOAOgIQAZgKAZgBIAsgFIAAAAIArgFQgIATgRAMQgRAMgVACIAUABQAgAAAfgJQgGAWgQARQBRAdBCA1QA8AvAtA+QAqA5AZA9QAwBngVBxIAAAGQgCBIgMBGQgsgfg1AAg");
	this.shape_3.setTransform(3.9855,-40.875);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.lf(["#FB7E51","#FF8F66"],[0,1],0,-72.3,-0.1,39.5).s().p("ABrAVQg9gJhAADQgiABgYgCQgsgFgmgUQgmgWgbgjIBqAMQAYALAlgCQAVgCApgFQA8gEA3AWQAlAQAbAZQAdAcAKAkQg0gmhBgKg");
	this.shape_4.setTransform(-10.075,-9.05);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.lf(["#FB7E51","#FF8F66"],[0,1],-39.7,524.5,-41.6,504.2).s().p("AhjBIIAWANIAZAJIAOAEIALABIAEABIANABIACABIAQAAQAQAAAVgDQg6gngPhEQgLgyANg8QACAJAEAJIAIARQAHCGBpBAQgfAEgbAAQhYAAg1gvg");
	this.shape_5.setTransform(-37.875,-16.6522);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.lf(["#FB7E51","#FB7F52","#FF8F66"],[0,0,1],3.2,8.6,-5.5,3.7).s().p("AgYBaQghgsgBg1QAAgpASgkQASglAggYIAIgFIAGA2IgBAAIAHA2IABACIAcC/Qg0gRgfgsg");
	this.shape_6.setTransform(-55.7007,9.725);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.lf(["#FB7E51","#FF8F66"],[0,1],-3.4,3.1,-3.5,57.9).s().p("ADNGJQgCg9AAg9QAAhjg3grQg6gtiGAAIkuAAQjLABgTAEQgEg9gDhKQgEiUAHhAIDeibQgGgCBvgUQBygUAqAHIEug3QCpgIBWCAQBABfgHBiIgfDUQA8AkASBEQARBDgkA9QgXAngnAWQgnAXgugBQgUAAgWgFQgtBAg5A8Ig2AxQAAg0gDg8g");
	this.shape_7.setTransform(3.8502,-6.3708);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.f("#FF8F66").s().p("AjzFHQgugfghgtQgggtgQg1QgGgUgEgZIgokSIgBgCIgHg2IABAAIgIhEQgDg3AOggQAIAQAJALIABABIAHAJIAPAOIAMAJQAWAVDTARIE1AYQApAFBrABQBYAAAEAFQACADACBJIADBNQAVBSgCAqQgDAfgbBdIAAALQhmBhhYAxQh1BBh1gBIgMAAQiDAAhSgzg");
	this.shape_8.setTransform(-10.547,22.3306);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-61.9,-78.4,123.5,138.5);


(lib.heeyes = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#262223").s().p("AgwBLQgUgUAAgcIAAg1QAAgcAVgUQAUgUAbAAQAcAAAVAUQATAUABAcIAAA1QAAAcgUAUQgUAUgdAAQgcAAgUgUg");
	this.shape.setTransform(-15.6,-0.0006);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#262223").s().p("AgvBLQgVgUAAgcIAAg1QAAgcAVgUQAUgUAbAAQAdAAAUAUQAUAUAAAcIAAA1QAAAcgUAUQgUAUgdAAQgcAAgTgUg");
	this.shape_1.setTransform(15.55,-0.0006);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-22.5,-9.5,45,19);


(lib.ClipGroup = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_2 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("AkaDWQgHgcAKhFIAMhBQAAgHgMglQgNgiACgHQAbhvA9gyQAtgmA8AAQARAAAQADQglA3ALBEQAGAhAMAXQBehXAFgOQAlgYBXgaQBXgZgOAMQhRBLAVBYQAHAhAVAZQAUAXASAEQAwBTANBhQi1ATifAAQh3gChygRg");
	mask.setTransform(29.0862,23.275);

	// Layer_3
	this.shape = new cjs.Shape();
	this.shape.graphics.lf(["#E69C31","#E67731"],[0,1],-28.8,0,28.9,0).s().p("AkgAQIAKgsQBbASCfAAQCqAACLgZIAIAtQiTAaiwgBQifAAhfgTg");
	this.shape.setTransform(28.875,29.95);

	var maskedShapeInstanceList = [this.shape];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.ClipGroup, new cjs.Rectangle(0,26.4,57.8,7.100000000000001), null);


(lib.Tween12 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.she_helmet("synched",0);
	this.instance.setTransform(-0.15,-38,0.8439,0.8439,-7.1574,0,0,0.1,0.1);

	this.instance_1 = new lib.Tween4("synched",0);
	this.instance_1.setTransform(7.4,16.35,0.8439,0.8439,-7.1574);

	this.shape = new cjs.Shape();
	this.shape.graphics.f("#363233").s().p("AnfBLQjHgbAAgjIAAgyIB0gWQCDgYBEgFQCmgODFAAQDEAACmAOQBuAKDPAeIAABAQAAAkjIAaQjHAZkYAAQkVgBjKgbg");
	this.shape.setTransform(3.7726,-5.0563,0.8438,0.8438,-7.1566);

	this.instance_2 = new lib.sheheadback("synched",0);
	this.instance_2.setTransform(5.45,30.75,0.8439,0.8439,-7.1574,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_2},{t:this.shape},{t:this.instance_1},{t:this.instance}]}).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-53.7,-76.7,114.7,158.2);


(lib.Tween3 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.ClipGroup();
	this.instance.setTransform(10.75,5.4,1,1,0,0,0,29.1,23.2);

	this.shape = new cjs.Shape();
	this.shape.graphics.f("#F2EDDC").s().p("AlZAyQANgyAZgxQAyhkA8AEQDAAQCAAQQBAAIAbAEQAsAPAUAOQAsAfAZA+QAJAUgDAdQgDAigTANQgMAHgqgGIgogIQgNAOgKAIQgTAOggAAIoEAAg");
	this.shape.setTransform(-3.9966,-0.8809);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#EDCF00").s().p("AkLC7QgHgcAGghIAIgcQABgHgNglQgMgjACgHQAfiABLguQA1ghBCAMQgkA3ALBEQAFAhANAXQBehXAFgOQArgdBAA1QBEA4AcBpQAkA+AJAtg");
	this.shape_1.setTransform(9.9612,0.8764);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape},{t:this.instance}]}).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-39.4,-17.8,79.3,46.6);


(lib.sheeyes_1 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.sheeyes();

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(112).to({scaleY:0.0947},0).to({scaleY:1},5).wait(53).to({_off:true},1).wait(7).to({_off:false},0).wait(75).to({_off:true},1).wait(46));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-21.5,-9.5,43,19);


(lib.heeyes_1 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// eyes
	this.instance = new lib.heeyes();
	this.instance.setTransform(0.15,0.1,0.8462,0.8462,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(291));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-19,-8,38.1,16.1);


(lib.Tween13 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// Layer_1
	this.instance = new lib.sheeyes_1("synched",2);
	this.instance.setTransform(14.15,28.95,0.8439,0.8439,-7.1574);

	this.instance_1 = new lib.she_helmet("synched",0);
	this.instance_1.setTransform(-0.15,-38,0.8439,0.8439,-7.1574,0,0,0.1,0.1);

	this.instance_2 = new lib.Tween4("synched",0);
	this.instance_2.setTransform(7.4,16.35,0.8439,0.8439,-7.1574);

	this.shape = new cjs.Shape();
	this.shape.graphics.f("#363233").s().p("AnfBLQjHgbAAgjIAAgyIB0gWQCDgYBEgFQCmgODFAAQDEAACmAOQBuAKDPAeIAABAQAAAkjIAaQjHAZkYAAQkVgBjKgbg");
	this.shape.setTransform(3.7683,-5.0559,0.8437,0.8437,-7.1561);

	this.instance_3 = new lib.sheheadback("synched",0);
	this.instance_3.setTransform(5.45,30.75,0.8439,0.8439,-7.1574,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_3},{t:this.shape},{t:this.instance_2},{t:this.instance_1},{t:this.instance}]}).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-53.7,-76.7,114.7,158.2);


// stage content:
(lib.Hardhatmobilev4HTML5Canvas2lib = function(mode,startPosition,loop,reversed, stage) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// she_arms
	this.shape = new cjs.Shape();
	this.shape.graphics.lf(["#FB7E51","rgba(251,127,82,0.957)","rgba(255,143,102,0)"],[0,0.373,1],5.5,5.9,2,1.9).s().p("AARA3QgIgGgDgKQgCgKgOgPQgPgOgSgKQgIgFgDgKQgCgJAEgIIABgDQAFgIAKgDQAKgDAJAGQAWANATATQAZAZAGAXQACAKgFAJQgGAJgKACIgGABQgHAAgGgDg");
	this.shape.setTransform(142.766,181.15);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.lf(["#FB7E51","rgba(251,127,82,0.957)","rgba(255,143,102,0)"],[0,0.373,1],7.3,6.1,3.8,2.1).s().p("AABBjQgGgGgLgXQgYgygugiQgHgFgCgJQgCgIADgIIADgFQAKgNAQAEQgEgKAFgIIACgFQAHgIAKgCQAKgBAIAGQAjAcAZAjQgKgVgRgQQgLgMAGgRIAFgGQAHgIAKAAQALAAAHAHQAbAaAOAhQAPAiAAAjQABALgIAHQgHAIgKAAQgFAAgFgCQgDAIgGAEQgLAGgJgEQAEAXgNAHQgHAEgGAAQgGAAgFgFg");
	this.shape_1.setTransform(148.9902,174.1617);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.lf(["#FB7E51","#FF8F66"],[0,1],-1.5,1.2,1.5,-1.1).s().p("AARA3QgIgGgDgKQgCgKgOgPQgPgOgSgKQgIgFgDgKQgCgJAEgIIABgDQAFgIAKgDQAKgDAJAGQAWANATATQAZAZAGAXQACAKgFAJQgGAJgKACIgGABQgHAAgGgDg");
	this.shape_2.setTransform(142.766,181.15);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.lf(["#FB7E51","#FF8F66"],[0,1],-0.8,0.8,0.6,-0.4).s().p("AAgBNQgHgGgLgXQgXgxgugjQgHgFgCgJQgCgIADgIIADgFQAGgIALgBQAKgCAIAHQA2AqAeA7QAIAQgBAQQgBAPgJAFQgHAEgGAAQgGAAgFgFg");
	this.shape_3.setTransform(145.8692,176.3742);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.lf(["#FB7E51","#FF8F66"],[0,1],-0.8,0.8,1.7,-1.2).s().p("AAfBNQgGgGgLgXQgXgwgugjQgHgGgCgIQgCgJADgIIADgEQAGgJAKgBQALgCAIAHQA2AqAdA7QAJARgBAPQgBAPgJAFQgHAEgGAAQgGAAgGgFg");
	this.shape_4.setTransform(148.8189,173.1492);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.lf(["#FB7E51","#FD875D","#FF8F66"],[0,0.451,1],-0.3,0.2,2.8,-1.8).s().p("AAHBKQgHgHAAgKQgBg5goglQgMgMAHgRIAFgGQAHgIAKAAQALAAAHAHQAaAaAOAhQAPAhAAAkQABALgIAHQgHAIgKAAIgBAAQgKAAgHgHg");
	this.shape_5.setTransform(153.7509,171.8751);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.lf(["#FB7E51","#FB7F53","#FF8F66"],[0,0.522,1],4.3,4.8,-0.3,0).s().p("AhUBHQgNgGgJgLQgIgMAAgNQABgQARgSQAQgRAhgIIA4gNQAHgDAVgSQAQgOAMADQASAFAMALQAOANACAQIAEABQgSApgpAcQgmAagxAIQgNACgLAAQgRAAgMgFg");
	this.shape_6.setTransform(146.7986,181.8566);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.lf(["#FB7E51","#FF8F66"],[0,1],12.3,3.8,6.2,2).s().p("AgFC9QhMgEgXhCQgNgmAFhMQAFheAQhhQADAFAPgDQAQgDAEABIARAGQAFABAOgDQAUgDAIgDIAbDKQAkgLAYAaQAVAXgHAQQgTA3geAgQgfAighAAIgEAAg");
	this.shape_7.setTransform(145.9031,200.6553);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.f("#F2EDDC").s().p("AAWBvQgXgagkALIgOhqQgFgigIgsQAIgMAMgbQANgVAQAFQASAHAXAbQAVAYAJAWQASAngRBaQgIArgLAkQACgOgSgUg");
	this.shape_8.setTransform(153.5188,192.4929);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.lf(["#FB7E51","#FF8F66"],[0,1],0,6.7,0,4).s().p("AAABDQAAAAAAAAQgBAAAAAAQgBAAAAgBQgBAAAAgBIgCACIhRAAQgKgDgGgIIgHgOQgGgRADgQQAFgZADgGQANgXAUgKQAMgFASgCQAngGALAAQAhgCAaAGQANADgIAFIgXAPQgNANgIANQgFAJgIAWQArAGApAPQAIAEAEAIQAEAJgDAJIgBADIhwgDg");
	this.shape_9.setTransform(108.9836,212.65);

	this.shape_10 = new cjs.Shape();
	this.shape_10.graphics.lf(["#FB7E51","#FC8155","#FC8459","#FF8F66"],[0,0.208,0.675,1],-0.2,2.6,0.7,-1.4).s().p("AAwAqQgsghgygIQgXgCgHgFQgLgGADgPQACgKAOgFQANgFASADQA7ALA1AlQAIAGACAJQABAKgGAIIgDAEQgGAFgIAAIgCAAQgHAAgGgEg");
	this.shape_10.setTransform(114.9567,215.246);

	this.shape_11 = new cjs.Shape();
	this.shape_11.graphics.lf(["#FB7E51","#FD875C","#FF8F66"],[0,0.596,1],-0.8,0.6,0.1,-2).s().p("AAdAsQgdgqgzgJQgKgCgFgIQgGgIACgJQACgKAIgFQAIgGAJACQBGANAoA5QAGAIgCAKQgBAKgIAFIgHADIgIABQgMAAgGgKg");
	this.shape_11.setTransform(118.5394,213.7652);

	this.shape_12 = new cjs.Shape();
	this.shape_12.graphics.lf(["#FB7E51","#FF8F66"],[0,1],0.1,1.9,2,-1.5).s().p("AAdAsQgdgqgzgJQgKgCgFgIQgGgIACgJQACgKAIgFQAIgGAJACQBGAOAoA5QAGAIgCAJQgBAKgIAFIgHAEIgHAAQgMAAgHgKg");
	this.shape_12.setTransform(119.5894,211.4441);

	this.shape_13 = new cjs.Shape();
	this.shape_13.graphics.f("#F2EDDC").s().p("AhAA3QgrgPghAPQA7hJAhggQA7g6AvgIQAbgFAXAMQAZANAGAYQAFAXgJAWQgGAMgTAdQgUAdhTBLQgXgtgwgSg");
	this.shape_13.setTransform(93.7758,190.6136);

	this.shape_14 = new cjs.Shape();
	this.shape_14.graphics.lf(["#FB7E51","#FF8F66"],[0,1],-0.1,22.2,0,15.8).s().p("AjQDIQgqgWAIhFQAHg8AigxQA3hQBchSQAYgVAQgHIAugRIAfADQAMAZAQAdQAIAXgRAeQgQAdgzA1IhXBaQAtAEBqgBQBgADA1AWQAUAJgEAhIgKA7IkAAEIgrAAQh/AAgQgIg");
	this.shape_14.setTransform(97.6943,199.2602);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_14},{t:this.shape_13},{t:this.shape_12},{t:this.shape_11},{t:this.shape_10},{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).to({state:[{t:this.shape_14},{t:this.shape_13},{t:this.shape_12},{t:this.shape_11},{t:this.shape_10},{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]},180).to({state:[{t:this.shape_14},{t:this.shape_13},{t:this.shape_12},{t:this.shape_11},{t:this.shape_10},{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]},119).wait(1));

	// she_body
	this.instance = new lib.Tween6("synched",0);
	this.instance.setTransform(122.95,200.8);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(39).to({startPosition:0},0).to({scaleX:1.0112,y:200.2},101).to({scaleX:1.0001,x:122.9,y:200.8},82).to({startPosition:0},1).wait(76).to({startPosition:0},0).wait(1));

	// she_eyes
	this.instance_1 = new lib.sheeyes_1("synched",0);
	this.instance_1.setTransform(127.35,153.75,0.8439,0.8439,-7.1574);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(39).to({startPosition:0},0).to({y:151.8,startPosition:89},101).to({regX:0.1,regY:0.1,rotation:-7.1566,x:127.45,y:153.85,startPosition:178},82).to({startPosition:178},1).wait(76).to({startPosition:0},0).wait(1));

	// she_head
	this.instance_2 = new lib.Tween12("synched",0);
	this.instance_2.setTransform(113.2,124.8);

	this.instance_3 = new lib.Tween13("synched",0);
	this.instance_3.setTransform(113.2,124.8);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(39).to({startPosition:0},0).to({y:122.85},101).to({_off:true,y:124.8},82).wait(78));
	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(140).to({_off:false},82).to({startPosition:0},1).wait(76).to({startPosition:0},0).wait(1));

	// he_arms
	this.shape_15 = new cjs.Shape();
	this.shape_15.graphics.lf(["#FB7E51","#FF8F66","#FB7E51"],[0,0.482,1],-7.8,5.3,-5.2,-9.9).s().p("AhdAyQADgvACgFQAJgZAWgYQAZgaAVABQAwAEAsAFQAQACgFAeQgFAbgNAPQg8BBgaAFQgxgBgggag");
	this.shape_15.setTransform(275.0595,202.246);

	this.shape_16 = new cjs.Shape();
	this.shape_16.graphics.lf(["#FB7E51","#FF8F66","#FB7E51"],[0,0.494,1],3.5,6.7,-1.3,-11.5).s().p("AjXB8IgEgWQgDggAYg2QAlhQBPgXQBfgdBCgFQAigDBrACQAAASglAtQgkAsABASIgMACQgpAIguAoQgyAygaAVg");
	this.shape_16.setTransform(251.5031,206.885);

	this.shape_17 = new cjs.Shape();
	this.shape_17.graphics.lf(["#FB7E51","#FF8F66"],[0,1],-1.7,1.8,1.1,-1).s().p("AAWA4QgIgEgFgIQgJgSgOgQQgOgOgJgDQgLgEgEgJQgFgJADgKQADgKAJgEQAJgFAKADQAXAHAXAbQASAUANAWQAEAJgDAKQgDAKgJAEIgDACQgEABgEAAQgFAAgFgBg");
	this.shape_17.setTransform(277.55,210.7313);

	this.shape_18 = new cjs.Shape();
	this.shape_18.graphics.lf(["#FB7E51","#FF8F66"],[0,1],-0.9,1.2,1.3,-1).s().p("AAkBDQgKgEgEgJQgKgUgWgYQgYgYgQgFQgKgCgFgJQgFgKACgKQADgKAJgFQAJgFAKADQAeAJAgAiQAdAcAOAdQAEAJgDAKQgEAKgJAEIgCABQgFACgEAAQgFAAgEgCg");
	this.shape_18.setTransform(281.9976,208.4188);

	this.shape_19 = new cjs.Shape();
	this.shape_19.graphics.lf(["#FB7E51","#FB7E51","#FF8F66"],[0,0.345,1],-1,1.7,1,-1.7).s().p("AAvBEQgJgDgFgHQgggxgvgZQgXgMgFgHQgIgKAIgOQAGgJAPAAQAPAAARAJQA4AgAoA5QAGAIgCALQgCAKgJAGIgFACQgEACgFAAIgHgBg");
	this.shape_19.setTransform(285.8811,205.1568);

	this.shape_20 = new cjs.Shape();
	this.shape_20.graphics.lf(["#FB7E51","#FF8F66","#FB7E51"],[0.004,0.486,1],-0.7,2,0.8,-3.5).s().p("AAwA0QgIgCgFgGQgjgqg4gEQgKAAgHgIQgGgIAAgKQABgLAIgGQAIgHAKABQBLAGAyA4QAHAIgBAKQAAALgIAGIgIAFQgEABgFAAIgGAAg");
	this.shape_20.setTransform(287.4545,200.5763);

	this.shape_21 = new cjs.Shape();
	this.shape_21.graphics.lf(["#FB7E51","#FF8F66"],[0,1],0.3,3.2,-0.2,-0.1).s().p("AhFAUQgDgJAEgKQAFgIAKgEQAYgIAbgCQAjgDAVALQAKAFAFANQAGAPgKABIiFACg");
	this.shape_21.setTransform(261.771,217.126);

	this.shape_22 = new cjs.Shape();
	this.shape_22.graphics.lf(["#FB7E51","#FF8F66"],[0,1],5.6,6.8,1.7,1.7).s().p("AhKASQgOgOgGgcQgGgeAQgEQArgJAsgGQAUgEAcAYQAYAWAMAYQACAGAIAdQghAng0AIQgYgCg+g3g");
	this.shape_22.setTransform(268.0311,211.0469);

	this.shape_23 = new cjs.Shape();
	this.shape_23.graphics.lf(["#FB7E51","#FF8F66"],[0,1],0.1,1.9,0,-1.3).s().p("AhBAtQgIAAgGgHQgFgGgCgJQgDgRARgJQAigTAggLQAsgQAdAGQAKACAGAJQAGAIgCAKQgDAKgIAFQgJAGgKgCQgMgDgiAVQgjAWgOAAIgWABIgFgBg");
	this.shape_23.setTransform(259.1225,214.8015);

	this.shape_24 = new cjs.Shape();
	this.shape_24.graphics.lf(["#FB7E51","#FF8F66"],[0,1],1,2.5,-0.3,-1).s().p("AhMAzIgEgDQgHgIAAgKQABgKAHgHQAzguA/gTQATgFAOADQAPAEADAKQAFAPgKAIQgHAGgYAHQg0AOgrAnQgGAGgJABIgBAAQgIAAgHgFg");
	this.shape_24.setTransform(256.7333,214.1052);

	this.shape_25 = new cjs.Shape();
	this.shape_25.graphics.lf(["#FF8F66","#FB7E51"],[0,1],-10.8,0,10.9,0).s().p("AgnA9QghgQgIgRQgDgIgQgVQgLgOADgQQADgTA2gQQA4gRAjARQAWALAMAJQAOAMAJATQAKAUABAYQAAAIgMAMQgQAQgaAGQgSAEgRAAQgeAAgdgOg");
	this.shape_25.setTransform(266.626,211.7732);

	this.shape_26 = new cjs.Shape();
	this.shape_26.graphics.f("#FF8F66").s().p("ABVBdQgsgBiqAAIimABQgBgXBEgwQBDgvgDgXIABAAIDCghQAtgHAXgCQAmgEAfADQAtAEAiATQAgAQAMAfQANAfgSAbQgYAmhBANQgcAGg1AAIgfgBg");
	this.shape_26.setTransform(289.7852,210.1329);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_26},{t:this.shape_25},{t:this.shape_24},{t:this.shape_23},{t:this.shape_22},{t:this.shape_21},{t:this.shape_20},{t:this.shape_19},{t:this.shape_18},{t:this.shape_17},{t:this.shape_16},{t:this.shape_15}]}).to({state:[{t:this.shape_26},{t:this.shape_25},{t:this.shape_24},{t:this.shape_23},{t:this.shape_22},{t:this.shape_21},{t:this.shape_20},{t:this.shape_19},{t:this.shape_18},{t:this.shape_17},{t:this.shape_16},{t:this.shape_15}]},299).wait(1));

	// he_eyes
	this.instance_4 = new lib.heeyes_1();
	this.instance_4.setTransform(275.05,166.4,1,1,3.212,0,0,0,0.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(22).to({regX:0.1,regY:0.5,scaleY:0.0968,rotation:2.9743,x:275,y:168.9},0).to({regX:0,regY:0.4,scaleY:1,rotation:3.2121,x:275.1,y:166.6},5).wait(79).to({regY:0.2,rotation:3.212,x:275.05,y:166.4},0).to({y:164.65},93).to({y:166.4},100).wait(1));

	// he_helmet
	this.instance_5 = new lib.hehelmet("synched",0);
	this.instance_5.setTransform(288.6,103.05,0.8462,0.8462,3.2117,0,0,0.2,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(106).to({startPosition:0},0).to({y:101.55},93).to({rotation:3.2118,y:103.05},100).wait(1));

	// he_head
	this.instance_6 = new lib.hehead("synched",0);
	this.instance_6.setTransform(287,155.1,0.8462,0.8462,3.2117,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(106).to({startPosition:0},0).to({y:153.6},93).to({y:155.1},100).wait(1));

	// he_shadow_helmet
	this.instance_7 = new lib.Tween14("synched",0);
	this.instance_7.setTransform(286.6,136.65);

	this.instance_8 = new lib.Tween15("synched",0);
	this.instance_8.setTransform(286.6,136.65);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_7}]}).to({state:[{t:this.instance_7}]},106).to({state:[{t:this.instance_7}]},93).to({state:[{t:this.instance_8}]},100).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(106).to({startPosition:0},0).to({y:135.15},93).to({_off:true,y:136.65},100).wait(1));

	// he_body
	this.instance_9 = new lib.Tween3("synched",0);
	this.instance_9.setTransform(288.5,201.25);

	this.timeline.addTween(cjs.Tween.get(this.instance_9).to({scaleX:1.0241,y:199.75},199).to({scaleX:1.0005,y:201.2},100).wait(1));

	this._renderFirstFrame();

}).prototype = p = new lib.AnMovieClip();
p.nominalBounds = new cjs.Rectangle(265.4,155.6,79.90000000000003,67.9);
// library properties:
lib.properties = {
	id: '77EE05FCC4694DC9B740761F53D7E669',
	width: 412,
	height: 219,
	fps: 30,
	color: "#FFFFFF",
	opacity: 1.00,
	manifest: [],
	preloads: []
};



// bootstrap callback support:

(lib.Stage = function(canvas) {
	createjs.Stage.call(this, canvas);
}).prototype = p = new createjs.Stage();

p.setAutoPlay = function(autoPlay) {
	this.tickEnabled = autoPlay;
}
p.play = function() { this.tickEnabled = true; this.getChildAt(0).gotoAndPlay(this.getTimelinePosition()) }
p.stop = function(ms) { if(ms) this.seek(ms); this.tickEnabled = false; }
p.seek = function(ms) { this.tickEnabled = true; this.getChildAt(0).gotoAndStop(lib.properties.fps * ms / 1000); }
p.getDuration = function() { return this.getChildAt(0).totalFrames / lib.properties.fps * 1000; }

p.getTimelinePosition = function() { return this.getChildAt(0).currentFrame / lib.properties.fps * 1000; }

an.bootcompsLoaded = an.bootcompsLoaded || [];
if(!an.bootstrapListeners) {
	an.bootstrapListeners=[];
}

an.bootstrapCallback=function(fnCallback) {
	an.bootstrapListeners.push(fnCallback);
	if(an.bootcompsLoaded.length > 0) {
		for(var i=0; i<an.bootcompsLoaded.length; ++i) {
			fnCallback(an.bootcompsLoaded[i]);
		}
	}
};

an.compositions = an.compositions || {};
an.compositions['77EE05FCC4694DC9B740761F53D7E669'] = {
	getStage: function() { return exportRoot.stage; },
	getLibrary: function() { return lib; },
	getSpriteSheet: function() { return ss; },
	getImages: function() { return img; }
};

an.compositionLoaded = function(id) {
	an.bootcompsLoaded.push(id);
	for(var j=0; j<an.bootstrapListeners.length; j++) {
		an.bootstrapListeners[j](id);
	}
}

an.getComposition = function(id) {
	return an.compositions[id];
}


an.makeResponsive = function(isResp, respDim, isScale, scaleType, domContainers, stage) {		
	var lastW, lastH, lastS=1;		
	window.addEventListener('resize', resizeCanvas);		
	resizeCanvas();		
	function resizeCanvas() {			
		var w = lib.properties.width, h = lib.properties.height;			
		var iw = window.innerWidth, ih=window.innerHeight;			
		var pRatio = window.devicePixelRatio || 1, xRatio=iw/w, yRatio=ih/h, sRatio=1;			
		if(isResp) {                
			if((respDim=='width'&&lastW==iw) || (respDim=='height'&&lastH==ih)) {                    
				sRatio = lastS;                
			}				
			else if(!isScale) {					
				if(iw<w || ih<h)						
					sRatio = Math.min(xRatio, yRatio);				
			}				
			else if(scaleType==1) {					
				sRatio = Math.min(xRatio, yRatio);				
			}				
			else if(scaleType==2) {					
				sRatio = Math.max(xRatio, yRatio);				
			}			
		}
		console.log(domContainers)
		domContainers[0].width = w * pRatio * sRatio;			
		domContainers[0].height = h * pRatio * sRatio;
		domContainers.forEach(function(container) {				
			container.style.width = w * sRatio + 'px';				
			container.style.height = h * sRatio + 'px';			
		});
		stage.scaleX = pRatio*sRatio;			
		stage.scaleY = pRatio*sRatio;
		lastW = iw; lastH = ih; lastS = sRatio;            
		stage.tickOnUpdate = false;            
		stage.update();            
		stage.tickOnUpdate = true;		
	}

	// [MODIFIED]: Added this return statement
	return resizeCanvas;
}
an.handleSoundStreamOnTick = function(event) {
	if(!event.paused){
		var stageChild = stage.getChildAt(0);
		if(!stageChild.paused || stageChild.ignorePause){
			stageChild.syncStreamSounds();
		}
	}
}
an.handleFilterCache = function(event) {
	if(!event.paused){
		var target = event.target;
		if(target){
			if(target.filterCacheList){
				for(var index = 0; index < target.filterCacheList.length ; index++){
					var cacheInst = target.filterCacheList[index];
					if((cacheInst.startFrame <= target.currentFrame) && (target.currentFrame <= cacheInst.endFrame)){
						cacheInst.instance.cache(cacheInst.x, cacheInst.y, cacheInst.w, cacheInst.h);
					}
				}
			}
		}
	}
}

// [MODIFIED]: Changed the params
})(window.createjs, window.AdobeAn);
