import Map from '../src/ol/Map.js';
import OGCMapTile from '../src/ol/source/OGCMapTile.js';
import TileLayer from '../src/ol/layer/Tile.js';
import TileWMS from '../src/ol/source/TileWMS.js';
import View from '../src/ol/View.js';

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new TileWMS({
        url: 'https://ahocevar.com/geoserver/wms',
        params: {
          'LAYERS': 'ne:NE1_HR_LC_SR_W_DR',
          'TILED': true,
        },
      }),
    }),
    new TileLayer({
      opacity: 0.75,
      source: new OGCMapTile({
        url:
          'https://vtp2.geo-solutions.it/geoserver/ogc/tiles/collections/ne:countries50m/map/tiles',
        tileMatrixSet: 'WorldCRS84Quad',
        context: {
          styleId: 'polygon',
        },
      }),
    }),
  ],
  view: new View({
    projection: 'EPSG:4326',
    center: [0, 0],
    zoom: 1,
  }),
});
