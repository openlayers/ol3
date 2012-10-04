
goog.provide('ol.interaction.Drag');

goog.require('goog.asserts');
goog.require('goog.events.EventType');
goog.require('goog.functions');
goog.require('ol.Coordinate');
goog.require('ol.MapBrowserEvent');
goog.require('ol.interaction.Interaction');


/**
 * @typedef {{capture: boolean,
 *            box: (boolean|undefined),
 *            boxClass: (string|undefined)}}
 */
ol.DragCaptureResponse;



/**
 * @constructor
 * @extends {ol.interaction.Interaction}
 */
ol.interaction.Drag = function() {

  goog.base(this);

  /**
   * @private
   * @type {Element}
   */
  this.box_ = null;

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
   * @type {ol.Coordinate}
   */
  this.startCenter = null;

  /**
   * @type {ol.Coordinate}
   */
  this.startCoordinate = null;

};
goog.inherits(ol.interaction.Drag, ol.interaction.Interaction);


/**
 * @param {ol.MapBrowserEvent} mapBrowserEvent Event.
 * @protected
 */
ol.interaction.Drag.prototype.handleDrag = goog.nullFunction;


/**
 * @param {ol.MapBrowserEvent} mapBrowserEvent Event.
 * @protected
 */
ol.interaction.Drag.prototype.handleDragEnd = goog.nullFunction;


/**
 * @param {ol.MapBrowserEvent} mapBrowserEvent Event.
 * @protected
 * @return {ol.DragCaptureResponse} Capture dragging response.
 */
ol.interaction.Drag.prototype.handleDragStart = function(mapBrowserEvent) {
  return {capture: false};
};


/**
 * @inheritDoc
 */
ol.interaction.Drag.prototype.handleMapBrowserEvent =
    function(mapBrowserEvent) {
  var map = mapBrowserEvent.map;
  if (!map.isDef()) {
    return;
  }
  var browserEvent = mapBrowserEvent.browserEvent;
  if (this.dragging_) {
    if (mapBrowserEvent.type == ol.MapBrowserEvent.EventType.DRAG) {
      goog.asserts.assert(browserEvent instanceof goog.events.BrowserEvent);
      this.deltaX = browserEvent.clientX - this.startX;
      this.deltaY = browserEvent.clientY - this.startY;
      if (this.box_) {
        goog.style.setPosition(this.box_,
            Math.min(browserEvent.clientX, this.startX),
            Math.min(browserEvent.clientY, this.startY));
        goog.style.setBorderBoxSize(this.box_,
            new ol.Size(Math.abs(this.deltaX), Math.abs(this.deltaY)));
      }
      this.handleDrag(mapBrowserEvent);
    } else if (mapBrowserEvent.type == ol.MapBrowserEvent.EventType.DRAGEND) {
      goog.asserts.assert(browserEvent instanceof goog.events.BrowserEvent);
      this.deltaX = browserEvent.clientX - this.startX;
      this.deltaY = browserEvent.clientY - this.startY;
      this.handleDragEnd(mapBrowserEvent);
      if (this.box_) {
        goog.dom.removeNode(this.box_);
        this.box_ = null;
      }
      this.dragging_ = false;
    }
  } else if (mapBrowserEvent.type == ol.MapBrowserEvent.EventType.DRAGSTART) {
    goog.asserts.assert(browserEvent instanceof goog.events.BrowserEvent);
    this.startX = browserEvent.clientX;
    this.startY = browserEvent.clientY;
    this.deltaX = 0;
    this.deltaY = 0;
    this.startCenter = /** @type {!ol.Coordinate} */ map.getCenter();
    this.startCoordinate = /** @type {ol.Coordinate} */
        mapBrowserEvent.getCoordinate();
    var handled = this.handleDragStart(mapBrowserEvent);
    if (handled.capture) {
      this.dragging_ = true;
      mapBrowserEvent.preventDefault();
      if (handled.box) {
        this.box_ = goog.dom.createDom(goog.dom.TagName.DIV, handled.boxClass);
        goog.style.setPosition(this.box_, this.startX, this.startY);
        goog.style.setBorderBoxSize(this.box_, new ol.Size(0, 0));
        goog.dom.appendChild(map.getOverlayContainer(), this.box_);
      }
    }
  }
};
