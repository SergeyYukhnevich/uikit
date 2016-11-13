(function(addon) {

  var component;

  if (window.UIkit) {
    component = addon(UIkit);
  }

  if (typeof define == 'function' && define.amd) {
    define('uikit-onboardtour', ['uikit'], function() {
      return component || addon(UIkit);
    });
  }

})(function(UI) {

  "use strict";

  /**
   * Tour class.
   *
   * @params options
   * @return Tour
   */
  function Tour(options) {
    this.init(options);
  }

  /**
   * Item class.
   *
   * @params options, tour
   * @return Item
   */
  function Step(options, tour) {
    this.tour = tour;
    this.state = 'hidden'; // [shown, hidden]

    this.init(options);
  }

  Tour.prototype = {

    /**
     * Default options for the tour.
     *
     * @type {Object}
     */
    defaults: {

      /**
       * Do not start tour inside one session.
       *
       * @type {boolean}
       */
      disableOnReload: true,

      /**
       * Array of tour items.
       *
       * @type {Array}
       */
      items: [],

      /**
       * Store data in localStorage.
       *
       * @type {boolean}
       */
      storeLocaly: true,

      /**
       * Timeout before the next step.
       *
       * @type {number}
       * @value milliseconds
       */
      timeout: 5000,

      /**
       * Number of times to show the tooltip.
       *
       * @type {number}
       */
      times: 5,

      /**
       * Tooltip options.
       *
       * @type {Object}
       */
      tooltip: {
        offset: 5,
        pos: 'top',
        animation: false,
        delay: 0, // in miliseconds
        cls: '',
        activeClass: 'uk-active',
      }

    },

    /**
     * List of initialized tour items.
     *
     * @type {Array}
     * @value Item
     */
    steps: [],

    /**
     * Key of item that is set in sessionStorage.
     *
     * @private
     * @type {string}
     */
    _SESSION_KEY: 'tour-session-id',

    /**
     * Init the tour plugin.
     *
     * @params options
     * @return void
     */
    init: function(options) {
      this.settings = UI.$.extend(true, {}, this.defaults, options);

      UI.$.each(this.settings.items, function(index, item) {
        var previous = this.steps[index - 1],
            step;

        item.previous = previous;
        item._id = Date.now();
        step = new Step(item, {
          timeout: this.settings.timeout,
          times: this.settings.times,
          tooltip: this.settings.tooltip
        });

        if (previous) {
          previous.settings.next = step;
        }

        this.steps.push(step);
      }.bind(this));
    },

    /**
     * Start tour.
     *
     * @params
     * @return void
     */
    start: function() {
      var step = this.steps[0];

      if (this._isInSession() || !step.$boundTo.length) {
        return;
      }

      this._setSession();
      step.listen(step.settings.events);
    },

    /**
     * Stop the tour.
     *
     * @params
     * @return void
     */
    stop: function() {},

    _setSession: function() {
      if (!this.settings.disableOnReload) {
        return;
      }

      sessionStorage.setItem(this._SESSION_KEY, this._id);
    },

    _isInSession: function() {
      if (!this.settings.disableOnReload) {
        return false;
      }

      return !!sessionStorage.getItem(this._SESSION_KEY);
    }

  };

  Step.prototype = {

    /**
     * Default options for the tour.
     *
     * @type {Object}
     */
    defaults: {

      /**
       * The element selector to which the tooltip should be bound to.
       *
       * @type {string}
       * @value selector
       */
      boundTo: '',

      /**
       * Events chain after which the tooltip should be shown.
       *
       * @type {Array}
       * @value selector event
       */
      events: [],

      /**
       * Tooltip message.
       *
       * @type {string}
       */
      message: ''

    },

    init: function(options) {
      var pos;

      this.settings = UI.$.extend(true, {}, this.defaults, options);
      this.$boundTo = UI.$(this.settings.boundTo).first();

      if (!this.$boundTo.length) {
        console.warn('onboardtour, bound to element is not found.');

        return;
      }

      this.$el = UI.$('<div class="onboardtour-step" />').appendTo(UI.$(this.settings.boundTo).first());

      pos = this.$boundTo.css('position');

      this.$boundTo.css({
        'position': (pos === 'absolute' || pos === 'fixed' || pos === 'relative') ? pos : 'relative'
      });
      this.$el.css({
        'bottom': 0,
        'height': '100%',
        'left': 0,
        'position': 'absolute',
        'right': 0,
        'top': 0,
        'width': '100%'
      });

      this.render();
    },

    render: function() {
      var tooltipOpts = UI.$.extend(true, {}, this.tour.tooltip, this.settings.tooltip, { src: this.settings.message });

      this.tooltip = UI.tooltip(this.$el, tooltipOpts);

      this.$el.off();
      this._addBeforeEvent();
    },

    show: function() {
      if (this.state === 'shown') {
        return;
      }

      this.state = 'shown';

      this.tooltip.show();
      this._hideTimeout();
    },

    hide: function() {
      if (this.state === 'hidden') {
        return;
      }

      this.state = 'hidden';

      this.tooltip.hide();
      this.$el.remove();
      UI.$(document).trigger('shown:step-' + this.settings._id, this);
    },

    listen: function(events) {
      if (!events || !events.length) {
        return this._fire();
      }

      var eventData = events.shift().split(' '),
          target = eventData[0],
          event = eventData[1],
          elements = {
            'document': UI.$doc,
            'window': UI.$win,
            'html': UI.$html,
            'body': UI.$body
          },
          $target = elements[target] || UI.$(target);

      $target.one(event, function(event) {
        this.listen(events);
      }.bind(this));
    },

    _hideTimeout: function() {
      setTimeout(this.hide.bind(this), this.tour.timeout);
    },

    _addBeforeEvent: function() {
      if (!this.settings.previous) {
        return;
      }

      this.settings.events.unshift('document shown:step-' + this.settings.previous.settings._id);
    },

    _fire: function() {
      var next = this.settings.next;

      if (next) {
        next.listen(next.settings.events);
      }

      this.show();
    }

  };

  UI.onboardtour = function(options) {
    return new Tour(options);
  };

  return UI.onboardtour;
});
