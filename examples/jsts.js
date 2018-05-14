import Map from '../src/ol/Map.js';
import View from '../src/ol/View.js';
import GeoJSON from '../src/ol/format/GeoJSON.js';
import {Tile as TileLayer, Vector as VectorLayer} from '../src/ol/layer.js';
import {fromLonLat} from '../src/ol/proj.js';
import OSM from '../src/ol/source/OSM.js';
import VectorSource from '../src/ol/source/Vector.js';
import Point from '../src/ol/geom/Point.js';
import LineString from '../src/ol/geom/LineString.js';
import Polygon from '../src/ol/geom/Polygon.js';
import MultiPoint from '../src/ol/geom/MultiPoint.js';
import MultiLineString from '../src/ol/geom/MultiLineString.js';
import MultiPolygon from '../src/ol/geom/MultiPolygon.js';

const source = new VectorSource();
fetch('data/geojson/roads-seoul.geojson').then(function(response) {
  return response.json();
}).then(function(json) {
  const format = new GeoJSON();
  const features = format.readFeatures(json, {featureProjection: 'EPSG:3857'});

  const parser = new jsts.io.OL3Parser();
  parser.inject(Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon);

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    // convert the OpenLayers geometry to a JSTS geometry
    const jstsGeom = parser.read(feature.getGeometry());

    // create a buffer of 40 meters around each line
    const buffered = jstsGeom.buffer(40);

    // convert back from JSTS and replace the geometry on the feature
    feature.setGeometry(parser.write(buffered));
  }

  source.addFeatures(features);
});
const vectorLayer = new VectorLayer({
  source: source
});

const rasterLayer = new TileLayer({
  source: new OSM()
});

const map = new Map({
  layers: [rasterLayer, vectorLayer],
  target: document.getElementById('map'),
  view: new View({
    center: fromLonLat([126.979293, 37.528787]),
    zoom: 15
  })
});
