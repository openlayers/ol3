// FIXME add rotation

goog.provide('ol.render.Box');

goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.events');
goog.require('ol.geom.Polygon');
goog.require('ol.render.EventType');



/**
 * @constructor
 * @extends {goog.Disposable}
 * @param {ol.style.Style} style Style.
 */
ol.render.Box = function(style) {

  /**
   * @private
   * @type {ol.Map}
   */
  this.map_ = null;

  /**
   * @private
   * @type {goog.events.Key}
   */
  this.postComposeListenerKey_ = null;

  /**
   * @private
   * @type {ol.Pixel}
   */
  this.startPixel_ = null;

  /**
   * @private
   * @type {ol.Pixel}
   */
  this.endPixel_ = null;

  /**
   * @private
   * @type {ol.geom.Polygon}
   */
  this.geometry_ = null;

  /**
   * @private
   * @type {ol.style.Style}
   */
  this.style_ = style;

};
goog.inherits(ol.render.Box, goog.Disposable);


/**
 * @private
 * @return {ol.geom.Polygon} Geometry.
 */
ol.render.Box.prototype.createGeometry_ = function() {
  goog.asserts.assert(this.startPixel_ !== null,
      'this.startPixel_ should not be null');
  goog.asserts.assert(this.endPixel_ !== null,
      'this.endPixel_ should not be null');
  goog.asserts.assert(this.map_ !== null, 'this.map_ should not be null');
  var startPixel = this.startPixel_;
  var endPixel = this.endPixel_;
  var pixels = [
    startPixel,
    [startPixel[0], endPixel[1]],
    endPixel,
    [endPixel[0], startPixel[1]]
  ];
  var coordinates = pixels.map(this.map_.getCoordinateFromPixel, this.map_);
  // close the polygon
  coordinates[4] = coordinates[0].slice();
  return new ol.geom.Polygon([coordinates]);
};


/**
 * @inheritDoc
 */
ol.render.Box.prototype.disposeInternal = function() {
  this.setMap(null);
};


/**
 * @param {ol.render.Event} event Event.
 * @private
 */
ol.render.Box.prototype.handleMapPostCompose_ = function(event) {
  var geometry = this.geometry_;
  goog.asserts.assert(goog.isDefAndNotNull(geometry),
      'geometry should be defined');
  var style = this.style_;
  goog.asserts.assert(style !== null, 'style should not be null');
  // use drawAsync(Infinity) to draw above everything
  event.vectorContext.drawAsync(Infinity, function(render) {
    render.setFillStrokeStyle(style.getFill(), style.getStroke());
    render.setTextStyle(style.getText());
    render.drawPolygonGeometry(geometry, null);
  });
};


/**
 * @return {ol.geom.Polygon} Geometry.
 */
ol.render.Box.prototype.getGeometry = function() {
  return this.geometry_;
};


/**
 * @private
 */
ol.render.Box.prototype.requestMapRenderFrame_ = function() {
  if (this.map_ !== null &&
      this.startPixel_ !== null &&
      this.endPixel_ !== null) {
    this.map_.render();
  }
};


/**
 * @param {ol.Map} map Map.
 */
ol.render.Box.prototype.setMap = function(map) {
  if (this.postComposeListenerKey_ !== null) {
    goog.events.unlistenByKey(this.postComposeListenerKey_);
    this.postComposeListenerKey_ = null;
    this.map_.render();
    this.map_ = null;
  }
  this.map_ = map;
  if (this.map_ !== null) {
    this.postComposeListenerKey_ = goog.events.listen(
        map, ol.render.EventType.POSTCOMPOSE, this.handleMapPostCompose_, false,
        this);
    this.requestMapRenderFrame_();
  }
};


/**
 * @param {ol.Pixel} startPixel Start pixel.
 * @param {ol.Pixel} endPixel End pixel.
 */
ol.render.Box.prototype.setPixels = function(startPixel, endPixel) {
  this.startPixel_ = startPixel;
  this.endPixel_ = endPixel;
  this.geometry_ = this.createGeometry_();
  this.requestMapRenderFrame_();
};
