import Map from '../src/ol/Map.js';
import OGCMapTile from '../src/ol/source/OGCMapTile.js';
import TileLayer from '../src/ol/layer/Tile.js';
import View from '../src/ol/View.js';
import XYZ from '../src/ol/source/XYZ.js';

const key = 'get_your_own_D6rA4zTHduk6KOKTXzGB';
const attributions =
  '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new XYZ({
        attributions: attributions,
        url:
          'https://api.maptiler.com/tiles/terrain-rgb/{z}/{x}/{y}.png?key=' +
          key,
        maxZoom: 10,
        crossOrigin: '',
      }),
    }),
    new TileLayer({
      opacity: 0.75,
      source: new OGCMapTile({
        url:
          'https://vtp2.geo-solutions.it/geoserver/ogc/tiles/collections/ne:countries50m/map/tiles',
        tileMatrixSet: 'WebMercatorQuad',
        context: {
          styleId: 'polygon',
        },
      }),
    }),
  ],
  view: new View({
    center: [0, 0],
    zoom: 1,
  }),
});
