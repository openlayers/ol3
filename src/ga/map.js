goog.provide('ga.Map');

goog.require('ol.Map');
goog.require('ol.View2D');
goog.require('ol.control.ScaleLine');
goog.require('ol.proj.EPSG21781');
goog.require('ol.RendererHint');


/**
 * @class
 * The map is the core component of the GeoAdmin API. In its minimal configuration it
 * needs a view, one or more geoadmin layers, and a target container:
 *
 *     var map = new ga.Map({
 *       view: new ol.View2D({
 *         center: [600000, 200000]
 *       }),
 *       layers: [
 *         ga.layer.create('ch.swisstopo.pixelkarte-farbe')
 *       ],
 *       target: 'map'
 *     });
 *
 * The above snippet creates a map with a GeoAdmin layer on a 2D view and
 * renders it to a DOM element with the id 'map'.
 * The coordinate system EPSG:21781 is automatically set.
 *
 * @constructor
 * @extends {ol.Map}
 * @param {ol.MapOptions} options Map options.
 */
ga.Map = function(options) {
  var renderer = ol.RendererHint.CANVAS;
  if (goog.isDefAndNotNull(options.renderer)) {
    renderer = options.renderer;
  }
  options.renderer = renderer;

  var view = new ol.View2D({
    resolutions: [
      650, 500, 250, 100, 50, 20, 10, 5, 2.5, 2, 1, 0.5, 0.25, 0.1
    ],
    projection: new ol.proj.EPSG21781(),
    center: [600000, 200000],
    zoom: 0
  });
  if (goog.isDef(options.view)) {
    // FIXME: see ol3 #1000
    if (goog.isDefAndNotNull(options.view.getCenter())) {
      view.setCenter(options.view.getCenter());
    }
    if (goog.isDef(options.view.getResolution())) {
      view.setResolution(options.view.getResolution());
    }
    if (goog.isDef(options.view.getRotation())) {
      view.setRotation(options.view.getRotation());
    }
    delete options.view;
  }
  options.view = view;

  goog.base(this, options);

  this.addControl(new ol.control.ScaleLine());
};
goog.inherits(ga.Map, ol.Map);
