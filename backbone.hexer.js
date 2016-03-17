// backbone.hexer.js 0.1
// (c) 2015 Lindsay Gaines

// backbone.hexer may be freely distributed under the MIT license.
// For all details and documentation:
// http://github.com/aethr/backbone.hexer

(function(root, factory) {
  // Set up depending on the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'backbone', 'jquery', 'exports'], function(_, Backbone, $, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      Backbone.Hexer = factory(root, exports, _, Backbone, $);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore'), Backbone = require('backbone'), $;
    try { $ = require('jquery'); } catch(e) {}

    factory(root, exports, _, Backbone, $);

  // Finally, as a browser global.
  } else {
    root.Backbone.Hexer = factory(root, {}, root._, root.Backbone, (root.jQuery || root.Zepto || root.ender || root.$));
  }
}(this, function(root, Hexer, _, Backbone, $) {

  // a Hexer is a Backbone View
  Hexer = Backbone.Hexer = Backbone.HexGridView = Backbone.View.extend({

    tagName: "div",
    className: "bbh-container",

    defaults: {
      depth: 2,
      color: '#999999',
      size: '6em',
      spacing: '0.5em',
      center: {x: 0, y: 0}
    },

    events: {},

    hexes: [],

    animateTimeout: null,

    initialize: function(options) {
      // Default options
      this.options = _.extend({}, this.defaults, options);

      // Split convenient notations (ie '5em') into their value and unit
      this.options.unit     = this.options.size.replace( /^\d+/g, '');
      if (this.options.unit == '') this.options.unit = 'em'; // Default to em
      // Parse the numeric values into floats
      this.options.size     = parseFloatIfString(this.options.size);
      this.options.spacing  = parseFloatIfString(this.options.spacing);
      this.options.center.x = parseFloatIfString(this.options.center.x);
      this.options.center.y = parseFloatIfString(this.options.center.y);

      _.bindAll(this, 'addAdjacentHexes');

      // Add the hex clip svg to the document so it can be used in the
      // clip-path: url(...); format in firefox
      // This is a hack so the developer doesm't need to include the svg in
      // every document
      var $div = $('<svg width="0" height="0"><defs><clipPath id="bbh-hexclip" clipPathUnits="objectBoundingBox"><polygon points="0.5 0 1 0.25 1 0.75 0.5 1 0 0.75 0 0.25"/></clipPath></defs></svg>');
      document.body.insertBefore($div[0], document.body.childNodes[0]);

      // Create all the Hexes
      this.createHexViews();
    },

    render: function() {
      // Allow each hex to re-render if necessary
      _.each(this.hexes, function (hex, i) {
        hex.render();
      });
      return this;
    },

    /**
     * Create the individual Hexes that will comrprise the grid.
     */
    createHexViews: function() {
      var fillDepth = (this.options.depth == 'fill') ? 10 : this.options.depth;

      for (var i = 0; i < fillDepth; i++) {
        switch (i) {
          // No Hexes have been created yet, make the first
          case 0:
            this.addHex({
              distance: 0,
              x: this.options.center.x,
              y: this.options.center.y
            });
            break;

          // Find every Hex at the current depth and add Hexes around it!
          default:
            // This is complicated!
            var allEdgeHexes = getHexesAtDistance(i - 1, this.hexes);
            _.each(allEdgeHexes, function (hex, index) {
              this.addAdjacentHexes(hex, 0, 6);
            }.bind(this));
            break;
        }
      }
    },

    /**
     * Helper function to create a single Hex with the specified options, and
     * add its el to the DOM.
     *
     * @param options
     *   Parameters to pass to the constructor of the new Hex
     * @returns {Hex}
     */
    addHex: function(options) {
      options = _.extend({
          size: this.options.size + this.options.unit,
          color: this.options.color
      }, options);
      var newHex = new Hex(options);
      this.hexes.push(newHex);
      this.$el.append(newHex.$el);

      return newHex;
    },

    /**
     * Add a single adjacent hex to the origin hex, at one of the edges
     * specified by the position.
     *
     * @param originHex
     *   The Hex that will have new Hexes added around its edges.
     * @param position
     *   The position of the edge where the new hex should be drawn
     *    0
     * 5 / \ 1
     * 4 \_/ 2
     *    3
     * @param hexParams
     *   The options to be passed to the new Hex
     */
    addAdjacentHex: function (originHex, position, hexParams) {
      // Calculate the angle between the originHex and the new adjacent Hex
      var angle = (position == 0) ? 0 : (2.0 * Math.PI / 6) * position,

          // Distance of the new Hex from the originHex
          scale = this.options.size + this.options.spacing,

          // Position of the new Hex
          x = originHex.options.x + (Math.cos(angle) * scale),
          y = originHex.options.y + (Math.sin(angle) * scale),

          // Store the distance from the original Hex
          distance = originHex.options.distance + 1,

          // Keep a reference to the originHex
          originPosition = oppositePosition(position),
          neighbors = {};

      // Since they are adjacent, the originHex will occupy the opposite edge
      neighbors[originPosition] = originHex;

      // Add a new Hex with the supplied parameters, at the new coordinates
      var newHex = this.addHex(_.extend({
        x: x,
        y: y,
        distance: distance,
        neighbors: neighbors
      }, hexParams));

      // Store a reference to the originHex's new neighbor
      originHex.addNeighbor(position, newHex, true);

      // If the originHex has neighbors adjacent to the new Hex, pass the
      // references so the Hex grid has a more complete set of relationships
      var prevPosition = (position - 1 >= 0) ? position - 1 : position + 5,
          nextPosition = (position + 1 < 6)  ? position + 1 : position - 5;
      if (_.has(originHex.options.neighbors, prevPosition)) {
        newHex.addNeighbor(prevPosition - 1, originHex.options.neighbors[prevPosition], true);
      }
      if (_.has(originHex.options.neighbors, nextPosition)) {
        newHex.addNeighbor(nextPosition + 1, originHex.options.neighbors[nextPosition], true);
      }
    },

    /**
     * Add new Hexes adjacent to the originHex, starting at the specified
     * startPosition.  Any positions that are already filled with a Hex will
     * be skipped.
     *
     * @param originHex
     *   The Hex to add adjacent Hexes to.
     * @param startPosition
     *   The position of the edge where the first Hex should be added.
     * @param count
     *   The number of Hexes to be added.
     */
    addAdjacentHexes: function(originHex, startPosition, count) {
      // Reset values back within legal bounds
      if (count > 6)
        count = 6;
      if (startPosition > 5) {
        startPosition -= 6;
      }
      // Add a new Hex for each edge until we reach the supplied count
      for (var i = startPosition; i < startPosition + count; i++) {
        // Don't try to add a new Hex where there is one already
        if (!_.isUndefined(originHex.options.neighbors[i]) && !_.isNull(originHex.options.neighbors[i])) {
          continue;
        }

        // Add the new Hex
        this.addAdjacentHex(originHex, i, {
          // Just an example, print the hex number inside each hex
//          content: _.partial(function(count) { return count; }, this.hexes.length)
        });
      }
    },

    /**
     * A function that allows an animation to be run across a set of Hexes.
     *
     * @param options
     *   An object which specifies how to animate the Hexes.  Valid keys are:
     *   animateQueue: a priority queue (array of arrays) of Hexes, with the
     *     top-level array determining the order of animation.  All hexes in
     *     the first
     *   animateFunction: a function with a single argument for a Hex.  This
     *     function will be called once on each Hex provided in order.
     *   delay: the number of ms to delay in between animating each Hex.
     */
    animate: function(options) {
      // Set some sane defaults for the animation
      var params = _.extend({
        animateFunction: function(hex) { /* Do something! */ },
        animateQueue: [this.hexes],
        delay: 50
      }, options);

      // Create a helper function that will help us execute a single animation
      // and then set a timeout for the next animation
      var animateHelper = function (animateQueue, animateFunction, delay) {
        // Execute the animation on the current Hex
        var animationTargets = animateQueue.shift();
        for (var i = 0; i < animationTargets.length; i++) {
          animateFunction(animationTargets[i]);
        }

        // If we haven't gotten to the end of the list, set a timer for the
        // next animation to occur
        if (animateQueue.length) {
          // Store a reference to the timeout in case we want to end early
          this.animateTimeout = setTimeout(function() {
            animateHelper(animateQueue, animateFunction, delay);
          }, params.delay);
        }
      }

      // Kick off the first animation straight away
      animateHelper(_.clone(params.animateQueue), params.animateFunction, params.delay);
    }

  });

  // a Hexer is a Backbone View
  var Hex = Backbone.View.extend({
    tagName: "div",
    className: "bbh-hex",

    defaults: {
      x: 0, y: 0,
      size: '3em',
      color: '#999999',
      content: '',
      neighbors: {}
    },

    neighbors: {},

    initialize: function(options) {
      // Default options
      this.options = _.extend({}, this.defaults, options);

      this.options.unit = this.options.size.replace( /^\d+/g, '');
      this.options.size = parseFloatIfString(this.options.size);

      // Allow content to be defined by a function, simply replace the
      // default function, which just returns this.options.content
      if (_.isFunction(this.options.content)) {
        this.content = this.options.content;
      }
    },

    render: function() {
      var cssProps = {
        clipPath: "url(#bbh-hexclip)",
        webkitClipPath: "url(#bbh-hexclip)",
        transform: 'translateX(' + this.options.x + this.options.unit + ') translateY(' + this.options.y + this.options.unit + ')',
        webkitTransform: 'translateX(' + this.options.x + this.options.unit + ' translateY(' + this.options.y + this.options.unit + ')',
        width:  (Math.sqrt(3)/2 * this.options.size) + this.options.unit, // width is smaller than height
        height: this.options.size + this.options.unit
      }

      if (_.isNull(this.options.color)) {
        cssProps.background = this.options.color;
      }

      // Set the css properties of the Hex to display in the right place
      this.$el.css(cssProps);

      // Set the inner content of the Hex if available
      this.$el.html('<div class="content"><span>' + this.content.call(this) + '</span></div>');

      return this;
    },

    /**
     * Default content function, just returns the content string.
     * @returns string
     */
    content: function() {
      return this.options.content;
    },

    /**
     * Add a reference to a neighboring Hex.
     * @param position
     *   The position of the neighbor.
     * @param hex
     *   The reference to the neighbor Hex.
     * @param exchange
     *   If true, a reference to this Hex will be passed to the neighboring Hex.
     */
    addNeighbor: function(position, hex, exchange) {
      exchange = (!_.isUndefined(exchange)) ? exchange : false;

      // Normalise position
      position = (position > 5) ? position - 6 : position;
      position = (position < 0) ? position + 6 : position;

      // Store a reference at the specified position to the new neighbor
      this.options.neighbors[position] = hex;

      // If Hexes are exchanging neighbors, tell the neighbor to store a
      // reference to this Hex in the opposite position
      if (exchange === true) {
        // For the neighbor Hex, this will occupy the opposite position
        hex.addNeighbor(oppositePosition(position), this, false);
      }
    }

  });


  /**
   * Privately scoped helper functions
   */

  // Remove CSS units (eg, 'px') and return the numeric value as a float
  function parseFloatIfString(value) {
    if (_.isString(value)) {
      return parseFloat(value.replace( /\D+$/g, ''));
    }
    else {
      return value * 1.0;
    }
  }

  // Gets the position on the opposite side of a Hex
  function oppositePosition(position) {
    return (position + 3 > 5) ? position - 3 : position + 3;
  }

  // This assumes that hexList is ordered by distance.
  function getHexesAtDistance(distance, hexList) {
    var first = null,
        last;
    _.each(hexList, function (hex, index) {
      if (_.isNull(first) && hex.options.distance == distance) {
        first = index;
      }
      if (_.isNull(last) && !_.isNull(first) && hex.options.distance > distance) {
        last = index;
      }
    });

    return hexList.slice(first, last);
  }

  // Current version of the library. Keep in sync with `package.json`.
  Hexer.VERSION = '0.0.1';

  return Hexer;
}));