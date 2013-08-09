goog.require('ol.Map');
goog.require('ol.RendererHint');
goog.require('ol.View2D');
goog.require('ol.layer.TileLayer');
goog.require('ol.layer.Vector');
goog.require('ol.parser.TopoJSON');
goog.require('ol.source.TileJSON');
goog.require('ol.source.Vector');
goog.require('ol.style.Polygon');
goog.require('ol.style.Rule');
goog.require('ol.style.Style');


var raster = new ol.layer.TileLayer({
  source: new ol.source.TileJSON({
    url: 'http://api.tiles.mapbox.com/v3/mapbox.world-dark.jsonp'
  })
});

var vector = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: 'data/topojson/world-110m.json',
    parser: new ol.parser.TopoJSON()
  }),
  style: new ol.style.Style({rules: [
    new ol.style.Rule({
      symbolizers: [
        new ol.style.Polygon({
          fillColor: '#BADA55',
          fillOpacity: 0.5,
          strokeColor: '#FFF',
          strokeOpacity: 1,
          strokeWidth: 1.5
        })
      ]
    })
  ]})
});

var map = new ol.Map({
  layers: [raster, vector],
  renderer: ol.RendererHint.CANVAS,
  target: 'map',
  view: new ol.View2D({
    center: [0, 0],
    zoom: 1
  })
});
