goog.require('ol.Coordinate');
goog.require('ol.Map');
goog.require('ol.RendererHints');
goog.require('ol.layer.TileLayer');
goog.require('ol.source.MapQuestOpenAerial');


var layer = new ol.layer.TileLayer({
  source: new ol.source.MapQuestOpenAerial()
});
var map = new ol.Map({
  layers: [layer],
  renderers: ol.RendererHints.createFromQueryData(),
  target: 'map'
});
var view = map.getView();
view.fitExtent(view.getProjection().getExtent(), map.getSize());
