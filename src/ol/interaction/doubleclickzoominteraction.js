// FIXME works for View2D only

goog.provide('ol.interaction.DoubleClickZoom');

goog.require('goog.asserts');
goog.require('ol.MapBrowserEvent');
goog.require('ol.MapBrowserEvent.EventType');
goog.require('ol.interaction.Interaction');



/**
 * Allows the user to zoom by double-clicking on the map.
 *
 * @constructor
 * @extends {ol.interaction.Interaction}
 * @param {ol.interaction.DoubleClickZoomOptions=} opt_options Options.
 */
ol.interaction.DoubleClickZoom = function(opt_options) {

  var options = goog.isDef(opt_options) ? opt_options : {};

  /**
   * @private
   * @type {number}
   */
  this.delta_ = goog.isDef(options.delta) ? options.delta : 1;

  goog.base(this);

  /**
   * @private
   * @type {number}
   */
  this.duration_ = goog.isDef(options.duration) ? options.duration : 250;

};
goog.inherits(ol.interaction.DoubleClickZoom, ol.interaction.Interaction);


/**
 * @inheritDoc
 */
ol.interaction.DoubleClickZoom.prototype.handleMapBrowserEvent =
    function(mapBrowserEvent) {
  var stopEvent = false;
  var browserEvent = mapBrowserEvent.browserEvent;
  if (mapBrowserEvent.type == ol.MapBrowserEvent.EventType.DBLCLICK &&
      ol.MapBrowserEvent.isMouseActionButton(browserEvent)) {
    var map = mapBrowserEvent.map;
    var anchor = mapBrowserEvent.getCoordinate();
    var delta = browserEvent.shiftKey ? -this.delta_ : this.delta_;
    // FIXME works for View2D only
    var view = map.getView().getView2D();
    ol.interaction.Interaction.zoomByDelta(
        map, view, delta, anchor, this.duration_);
    mapBrowserEvent.preventDefault();
    stopEvent = true;
  }
  return !stopEvent;
};
