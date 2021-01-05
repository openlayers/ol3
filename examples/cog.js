import GeoTIFF from '../src/ol/source/GeoTIFF.js';
import Map from '../src/ol/Map.js';
import Projection from '../src/ol/proj/Projection.js';
import TileLayer from '../src/ol/layer/WebGLTile.js';
import View from '../src/ol/View.js';
import proj4 from 'proj4';
import {getCenter} from '../src/ol/extent.js';
import {register} from '../src/ol/proj/proj4.js';

proj4.defs('EPSG:32636', '+proj=utm +zone=36 +datum=WGS84 +units=m +no_defs');
register(proj4);

const projection = new Projection({
  code: 'EPSG:32636',
  extent: [166021.44, 0.0, 534994.66, 9329005.18],
});

// metadata from https://s3.us-west-2.amazonaws.com/sentinel-cogs/sentinel-s2-l2a-cogs/2020/S2A_36QWD_20200701_0_L2A/S2A_36QWD_20200701_0_L2A.json
const sourceExtent = [499980, 1790220, 609780, 1900020];

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new GeoTIFF({
        sources: [
          {
            url:
              'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/2020/S2A_36QWD_20200701_0_L2A/TCI.tif',
            nodata: 0,
          },
        ],
      }),
      extent: sourceExtent,
    }),
  ],
  view: new View({
    center: getCenter(sourceExtent),
    extent: sourceExtent,
    zoom: 9,
    projection: projection,
  }),
});
