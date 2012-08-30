
goog.provide('ol3.interaction.Drag');

goog.require('goog.asserts');
goog.require('goog.events.EventType');
goog.require('goog.functions');
goog.require('ol3.Coordinate');
goog.require('ol3.Interaction');
goog.require('ol3.MapBrowserEvent');
goog.require('ol3.interaction.Constraints');



/**
 * @constructor
 * @extends {ol3.Interaction}
 * @param {ol3.interaction.Constraints} constraints Constraints.
 */
ol3.interaction.Drag = function(constraints) {

  goog.base(this, constraints);

  /**
   * @private
   * @type {boolean}
   */
  this.dragging_ = false;

  /**
   * @type {number}
   */
  this.startX = 0;

  /**
   * @type {number}
   */
  this.startY = 0;

  /**
   * @type {number}
   */
  this.offsetX = 0;

  /**
   * @type {number}
   */
  this.offsetY = 0;

  /**
   * @type {ol3.Coordinate}
   */
  this.startCenter = null;

  /**
   * @type {ol3.Coordinate}
   */
  this.startCoordinate = null;

};
goog.inherits(ol3.interaction.Drag, ol3.Interaction);


/**
 * @param {ol3.MapBrowserEvent} mapBrowserEvent Event.
 * @protected
 */
ol3.interaction.Drag.prototype.handleDrag = goog.nullFunction;


/**
 * @param {ol3.MapBrowserEvent} mapBrowserEvent Event.
 * @protected
 */
ol3.interaction.Drag.prototype.handleDragEnd = goog.nullFunction;


/**
 * @param {ol3.MapBrowserEvent} mapBrowserEvent Event.
 * @protected
 * @return {boolean} Capture dragging.
 */
ol3.interaction.Drag.prototype.handleDragStart = goog.functions.FALSE;


/**
 * @inheritDoc
 */
ol3.interaction.Drag.prototype.handleMapBrowserEvent =
    function(mapBrowserEvent) {
  var map = mapBrowserEvent.map;
  if (!map.isDef()) {
    return;
  }
  var browserEvent = mapBrowserEvent.browserEvent;
  if (this.dragging_) {
    if (mapBrowserEvent.type == goog.fx.Dragger.EventType.DRAG) {
      goog.asserts.assert(browserEvent instanceof goog.events.BrowserEvent);
      this.deltaX = browserEvent.clientX - this.startX;
      this.deltaY = browserEvent.clientY - this.startY;
      this.handleDrag(mapBrowserEvent);
    } else if (mapBrowserEvent.type == goog.fx.Dragger.EventType.END) {
      goog.asserts.assert(browserEvent instanceof goog.events.BrowserEvent);
      this.deltaX = browserEvent.clientX - this.startX;
      this.deltaY = browserEvent.clientY - this.startY;
      this.handleDragEnd(mapBrowserEvent);
      this.dragging_ = false;
    }
  } else if (mapBrowserEvent.type == goog.fx.Dragger.EventType.START) {
    goog.asserts.assert(browserEvent instanceof goog.events.BrowserEvent);
    this.startX = browserEvent.clientX;
    this.startY = browserEvent.clientY;
    this.deltaX = 0;
    this.deltaY = 0;
    this.startCenter = /** @type {!ol3.Coordinate} */ map.getCenter();
    this.startCoordinate = /** @type {ol3.Coordinate} */
        mapBrowserEvent.getCoordinate();
    if (this.handleDragStart(mapBrowserEvent)) {
      this.dragging_ = true;
      mapBrowserEvent.preventDefault();
    }
  }
};
