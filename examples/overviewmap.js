goog.require('ol.Map');
goog.require('ol.RendererHints');
goog.require('ol.View2D');
goog.require('ol.control.OverviewMap');
goog.require('ol.interaction.DragRotateAndZoom');
goog.require('ol.interaction.defaults');
goog.require('ol.layer.TileLayer');
goog.require('ol.source.MapQuestOpenAerial');
goog.require('ol.source.OSM');


/**
 * Helper method for map-creation.
 *
 * @param {string} divId The id of the div for the map.
 * @param {boolean} rotate Whether to add a DragRotateAndZoom interaction
 *     or not.
 * @return {ol.Map} The ol.Map instance.
 */
var createMap = function(divId, rotate) {
  rotate = rotate || false;
  var mapOptions = {
    layers: [
      new ol.layer.TileLayer({
        source: new ol.source.OSM()
      })
    ],
    renderers: ol.RendererHints.createFromQueryData(),
    target: divId,
    view: new ol.View2D({
      center: [0, 0],
      zoom: 2
    })
  };
  if (rotate) {
    mapOptions.interactions = ol.interaction.defaults({}, [
      new ol.interaction.DragRotateAndZoom()
    ]);
  }
  return new ol.Map(mapOptions);
};

var map1 = createMap('map1', false);
var overview1 = new ol.control.OverviewMap({
  map: map1
});

var map2 = createMap('map2', false);
var overview2 = new ol.control.OverviewMap({
  map: map2,
  maximized: true
});

var map3 = createMap('map3', true);
var overview3 = new ol.control.OverviewMap({
  layers: [
    new ol.layer.TileLayer({
      source: new ol.source.MapQuestOpenAerial()
    })
  ],
  map: map3,
  maximized: true,
  maxRatio: 0.5,
  minRatio: 0.025
});
