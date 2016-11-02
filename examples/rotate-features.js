goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.format.GeoJSON');
goog.require('ol.interaction');
goog.require('ol.interaction.Rotate');
goog.require('ol.interaction.Select');
goog.require('ol.layer.Tile');
goog.require('ol.layer.Vector');
goog.require('ol.source.OSM');
goog.require('ol.source.Vector');


var raster = new ol.layer.Tile({
  source: new ol.source.OSM()
});

var vector = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: 'data/geojson/countries.geojson',
    format: new ol.format.GeoJSON()
  })
});

var select = new ol.interaction.Select();

var map = new ol.Map({
  interactions: ol.interaction.defaults().extend([select]),
  layers: [raster, vector],
  target: 'map',
  view: new ol.View({
    center: [0, 0],
    zoom: 2
  })
});

var useHandleCheckbox = document.getElementById('useHandle');
var rotate;
function addRotateInteraction() {
  rotate = new ol.interaction.Rotate({
    customAnchorCondition: ol.events.condition.shiftKeyOnly,
    features: select.getFeatures(),
    useHandle: useHandleCheckbox.checked
  });
  map.addInteraction(rotate);
}

useHandleCheckbox.onchange = function() {
  map.removeInteraction(rotate);
  addRotateInteraction();
};

addRotateInteraction();
