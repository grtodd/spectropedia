/*!
 * jQuery.overscroll JavaScript Plugin v1.2.0
 * http://azoffdesign.com/plugins/js/overscroll
 *
 * Intended for use with the latest jQuery
 * http://code.jquery.com/jquery-latest.min.js
 *
 * Copyright 2010, Jonathan Azoff
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * Date: Sunday, February 28 2010
 *
 * Changelog:
 *
 * 1.2.0
 *   - Updated license to match the jQuery license (thanks Jesse)
 *   - Added vertical scroll wheel support (thanks Pwakman)
 *   - Added support to ignore proprietary drag events (thanks Raphael)
 *   - Added "smart" click support for clickable elements (thanks Mark)
 * 1.1.2
 *   - Added the correct click handling to the scroll operation (thanks Evilc)
 * 1.1.1
 *   - Made scroll a bit smoother (thanks Nick)
 * 1.1.0
 *   - Optimized scrolling-internals so that it is both smoother and more memory efficient 
 *     (relies entirely on event model now). 
 *   - Added the ability to scroll horizontally (if the overscrolled element has wider children).
 * 1.0.3
 *   - Extended the easing object, as opposed to the $ object (thanks Andre)
 * 1.0.2
 *   - Fixed timer to actually return milliseconds (thanks Don)
 * 1.0.1
 *   - Fixed bug with interactive elements and made scrolling smoother (thanks Paul and Aktar)
 *
 * Notes:
 * 
 * In order to get the most out of this plugin, make sure to only apply it to parent elements 
 * that are smaller than the collective width and/or height then their children. This way,
 * you can see the actual scroll effect as you pan the element.
 *
 * You MUST have two cursors to get the hand to show up, open, and close during the panning 
 * process. You can put the cursors wherever you want, just make sure to reference them in 
 * the code below. I have provided initial static linkages to these cursors for your 
 * convenience (see below).
 *
 */
 
(function($, o){

  // safari has a bizarre wheelDelta
  var isSafari = (navigator.userAgent.indexOf("Safari") !== -1) && (navigator.userAgent.indexOf("Chrome") === -1);


	// create overscroll
	o = $.fn.overscroll = function() {
		this.each(o.init);
	}
	
	$.extend(o, {
		
		// overscroll icons
		icons: {
        //open: "http://static.azoffdesign.com/misc/open.cur",
        //closed: "http://static.azoffdesign.com/misc/closed.cur"
        open   : "ext/open.cur",
        closed : "ext/closed.cur"
		},
		
		// main initialization function
		init: function(data, target, size) {
			data = {};
			
			target = $(this)
				.css({"cursor":"url("+o.icons.open+"), default", "overflow": "hidden"})
				.bind("mousewheel DOMMouseScroll", data, o.wheel)
				.bind("select mousedown", data, o.start)
				.bind("mouseup mouseleave", data, o.stop)
				.bind("click", o.click)
				// disable proprietary drag handlers
				.bind("ondragstart drag", function(){return false;});
				
			data.target = target;	
		},
		
		// handles click events
		click: function(event) {
			if (typeof event.target.clickable === "undefined") {
				event.target.clickable = o.clickableRegExp.test(event.target.tagName);
			}
			return event.target.clickable;
		},
		
		// handles mouse wheel scroll events
		wheel: function(event, delta) {
      if ( event.wheelDelta ) delta = event.wheelDelta/12000;
			if ( event.detail     ) delta = -event.detail/3;
			delta *= o.constants.wheelDeltaMod;
      delta *= (isSafari ? 10.0 : 0.1);
			/*event.data.target.stop(true, true).animate({
        scrollTop: this.scrollTop - delta,
				scrollLeft: this.scrollLeft - delta
			},{ 
				queue: false, 
				duration: o.constants.scrollDuration, 
        easing: "cubicEaseOut"
        });*/
      this.scrollLeft = this.scrollLeft - delta;
			return false;
		},
		
		// starts the drag operation and binds the mouse move handler
		start: function(event) {
			event.data.target
				.css("cursor", "url("+o.icons.closed+"), default")
				.bind("mousemove", event.data, o.drag)
				.stop(true, true);
			event.data.position = { 
				x: event.pageX,
				y: event.pageY
			};
			event.data.capture = {};
			return false;
		},
		
		// ends the drag operation and unbinds the mouse move handler
		stop: function(event) {
			if( typeof event.data.position !== "undefined" ) {
				event.data.target
					.css("cursor", "url("+o.icons.open+"), default")
					.unbind("mousemove", o.drag);
				var border = false,
  			clicked = (typeof event.data.capture.time === "undefined");
				if ( !clicked ) {	
					var dt = (o.time() - event.data.capture.time);
					var dx = o.constants.scrollDeltaMod * (event.pageX - event.data.capture.x);
					var dy = o.constants.scrollDeltaMod * (event.pageY - event.data.capture.y);
					event.data.target.stop(true, true).animate({
						scrollLeft: this.scrollLeft - dx,
             //scrollTop: this.scrollTop - dy
					},{ 
						queue: false, 
						duration: o.constants.scrollDuration, 
            easing: "cubicEaseOut"
					});
				}
				event.data.capture = event.data.position = undefined;
			}
			return clicked;
		},
		
		// updates the current scroll location during a mouse move
		drag: function(event) {
			this.scrollLeft -= (event.pageX - event.data.position.x);
			//this.scrollTop -= (event.pageY - event.data.position.y);
			event.data.position.x = event.pageX;
			event.data.position.y = event.pageY;
			if (typeof event.data.capture.index === "undefined" || --event.data.capture.index==0 ) {
				event.data.capture = {
					x: event.pageX,
					y: event.pageY,
					time: o.time(),
					index: o.constants.captureThreshold
				}
			}
			return true;
		},
		
		time: function() {
			return (new Date()).getTime();
		},
		
		// determines what elements are clickable
		clickableRegExp: (/input|textarea|select|a/i),
		
		constants: {
			scrollDuration: 800,
			captureThreshold: 4,
			wheelDeltaMod: -200,
			scrollDeltaMod: 4.7
		}
		
	});

	// jQuery adapted Penner animation
	//    created by Jamie Lemon
	$.extend( $.easing, {
		cubicEaseOut: function(p, n, firstNum, diff) {
			var c = firstNum + diff;
			return c*((p=p/1-1)*p*p + 1) + firstNum;
		}
	});

})(jQuery);
