/*jslint on: true, eqeqeq: true */
/*
	TODOs:
	
	Fo sho:
		- The buffer is actually loading all the images at the same time, only load the next one on page.onload
		- Show a progress bar when buffering
		- use document.body.offsetWidth where present? (instead of window.innerWidth, the former excludes the width of scrollbars)
		- scroll two pages at a time in double page mode
		- manga mode
		- page controls
		- thumbnail browser
		- chrome frame
	
	Nice 2 have:
		- remember position (use localStorage)
		- maybe use local storage for the pages array too? might be easier to implement manga mode with that
		- offline mode
		- page turn animation
	
*/

/**
 * Merge two arrays. Any properties in b will replace the same properties in
 * a. New properties from b will be added to a.
 *
 * @param a {Object}
 * @param b {Object}
 */
function merge(a, b) {

	var prop;

	if (typeof b === "undefined") { b = {}; }

	for (prop in a) {
		if (a.hasOwnProperty(prop)) {
			if (prop in b) { continue; }
			b[prop] = a[prop];
		}
	}

	return b;
}

function ComicBook(id, srcs, opts) {

	this.id = id;		// canvas element id
	this.srcs = srcs;	// array of image srcs for pages

	var defaults = {
		displayMode: "double",	// single / double
		zoomMode: "fitWidth"	// manual / fitWidth
	};
	
	var options = merge(defaults, opts); // options array for internal use

	var pages = [];		// array of preloaded Image objects
	var canvas;			// the HTML5 canvas object
	var context;		// the 2d drawing context
	
	var buffer = 4;		// image preload buffer level
	var pointer = 0;	// the current page
	var loaded = 0;		// the amount of images that have been loaded so far
	
	var scale = 1;		// page zoom scale, 1 = 100%

	/**
	 * Figure out the cursor position relative to the canvas.
	 *
	 * Thanks to: Mark Pilgrim & http://diveintohtml5.org/canvas.html
	 */
	function getCursorPosition(e) {

		var x; // horizontal cursor position

		// check if page relative positions exist, if not figure them out
		if (e.pageX) {
			x = e.pageX;
		} else {
			x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		}

		// make the position relative to the canvas
		x -= canvas.offsetLeft;

		// check if the user clicked on the left or right side
		return (x <= canvas.width / 2) ? 'left' : 'right';
	}

	/* 
	 * @param {String} id The canvas ID to draw the comic on.
	 * @param {Object} srcs An array of all the comic page srcs, in order
	 * @see #preload
	 */
	ComicBook.prototype.draw = function () {
	
		// setup canvas
		canvas = document.getElementById(this.id);
		context = canvas.getContext("2d");

		// preload images if needed
		if (pages.length !== this.srcs.length) { this.preload(this.srcs); }
		else { this.drawPage(); }

		// add page controls
		canvas.addEventListener("click", ComicBook.prototype.navigation, false);
	};

	/*
	 * Zoom the canvas
	 * 
	 * @param new_scale {Number} Scale the canvas to this ratio
	 */
	ComicBook.prototype.zoom = function (new_scale) {
		options.zoomMode = "manual";
		scale = new_scale;
		if (typeof pages[pointer] === "object") { this.drawPage(); }
	};
	
	/**
	 * Preload all images, draw the page only after a given number have been loaded.
	 *
	 * @param srcs {Object} srcs
	 * @see #drawPage
	 */
	ComicBook.prototype.preload = function (srcs) {

		if (srcs.length < buffer) { buffer = srcs.length; } // don't get stuck if the buffer level is higher than the number of pages

		var i = 0; // the current page counter for this method

		// I am using recursion instead of a forEach loop so that the next image is
		// only loaded when the previous one has completely finished
		function preload(i) {
		
			var page = new Image();

			// console.log("starting to load: " + srcs[i]);

			page.src = srcs[i];

			page.onload = function () {

				// console.info("loaded: " + srcs[i]);

				pages[i] = this;
				loaded += 1;

				// there are still more pages to load, do it
				if (loaded < srcs.length) {
					i += 1;
					preload(i);
				}

				// start rendering the comic when the buffer level has been reached
				if (loaded === buffer + 1) { ComicBook.prototype.drawPage(); }
				if (loaded === srcs.length) { /* console.log("all loaded"); */ }
			};
		}

		if (i === 0) { preload(i); }
	};

	/**
	 * Draw the current page in the canvas
	 *
	 * TODO: break this down into drawSinglePage() & drawDoublePage()
	 * TODO: if the current browser doesn't have canvas support, use img tags
	 */
	ComicBook.prototype.drawPage = function () {
	
		var zoom_scale;
		var offsetW = 0, offsetH = 0;
		
		var page = pages[pointer];
		var page2 = pages[pointer + 1];

		if (typeof page !== "object") { throw "invalid page type '"+ typeof page +"'"; }
		
		var width = page.width;
		
		if (options.displayMode === "double") {

			// for double page spreads, factor in the width of both pages
			if (typeof page2 === "object") { width += page2.width; }
			
			// if this is the last page and there is no page2, still keep the canvas wide
			else { width += width; }
		}

		// update the page scale if a non manual mode has been chosen
		switch(options.zoomMode) {

			case "manual":
				zoom_scale = (options.displayMode === "double") ? scale * 2 : scale;
				break;
				
			case "fitWidth":
				zoom_scale =  (window.innerWidth > width) ? ((window.innerWidth - width) / window.innerWidth) + 1 // scale up if the window is wider than the page
					  : window.innerWidth / width; // scale down if the window is narrower than the page
				break;
				
			default:throw "invalid zoomMode";
		}
		
		var canvas_width  = page.width * zoom_scale;
		var canvas_height = page.height * zoom_scale;

		var page_width = (options.zoomMode === "manual") ? page.width * scale : canvas_width;
		var page_height = (options.zoomMode === "manual") ? page.height * scale : canvas_height;
		
		canvas_height = page_height;
		
		// make sure the canvas is always at least full screen, even if the page is more narrow than the screen
		canvas.width = (canvas_width < window.innerWidth) ? window.innerWidth : canvas_width;
		canvas.height = (canvas_height < window.innerHeight) ? window.innerHeight : canvas_height;
		
		// work out a horizonal position that will keep the pages always centred
		if (canvas_width < window.innerWidth && options.zoomMode === "manual") {
			offsetW = (window.innerWidth - page_width) / 2;
			if (options.displayMode === "double") { offsetW = offsetW - page_width / 2; }
		}
		
		// work out a vertical position that will keep the pages always centred
		if (canvas_height < window.innerHeight && options.zoomMode === "manual") {
			offsetH = (window.innerHeight - page_height) / 2;
		}
		
		// draw the page(s)
		context.drawImage(page, offsetW, offsetH, page_width, page_height);
		if (options.displayMode === "double" && typeof page2 === "object") { context.drawImage(page2, page_width + offsetW, offsetH, page_width, page_height); }
		
	};

	/**
	 * Increment the counter and draw the page in the canvas
	 * 
	 * @see #drawPage
	 */
	ComicBook.prototype.drawNextPage = function () {
		if (pointer + 1 < pages.length) {
			pointer++;
			this.drawPage();
		}
	};

	/**
	 * Decrement the counter and draw the page in the canvas
	 *
	 * @see #drawPage
	 */
	ComicBook.prototype.drawPrevPage = function () {
		if (pointer > 0) {
			pointer--;
			this.drawPage();
		}
	};
	
	ComicBook.prototype.navigation = function (e) {

		if (e.type === "click") {
			switch (getCursorPosition(e)) {
				case "left": ComicBook.prototype.drawPrevPage(); break;
				case "right": ComicBook.prototype.drawNextPage(); break;
			}
		}
	};
}

var book;

window.onload = function() {

	var pages = [
		"http://dev.justforcomics.com/get/image/?f=comics/extracted/oni_whiteout_melt_1/00.jpg",
		"http://dev.justforcomics.com/get/image/?f=comics/extracted/oni_whiteout_melt_1/01.jpg",
		"http://dev.justforcomics.com/get/image/?f=comics/extracted/oni_whiteout_melt_1/02.jpg",
		"http://dev.justforcomics.com/get/image/?f=comics/extracted/oni_whiteout_melt_1/03.jpg",
		"http://dev.justforcomics.com/get/image/?f=comics/extracted/oni_whiteout_melt_1/04.jpg",
		"http://dev.justforcomics.com/get/image/?f=comics/extracted/oni_whiteout_melt_1/05.jpg",
		"http://dev.justforcomics.com/get/image/?f=comics/extracted/oni_whiteout_melt_1/06.jpg"
	];

	var options = {
		displayMode: "double",
		zoomMode: "fitWidth"
	};

	book = new ComicBook("comic", pages, options);
	book.draw();
};

window.onresize = function() {
	book.draw();
};
