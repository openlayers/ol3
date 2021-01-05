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
      style: {
        color: [
          'interpolate',
          ['linear'],
          // calculate NDVI, bands come from the sources below
          [
            '/',
            ['-', ['band', 2], ['band', 1]],
            ['+', ['band', 2], ['band', 1]],
          ],
          // color ramp for NDVI values, ranging from -1 to 1
          -0.2,
          [191, 191, 191],
          -0.1,
          [219, 219, 219],
          0,
          [255, 255, 224],
          0.025,
          [255, 250, 204],
          0.05,
          [237, 232, 181],
          0.075,
          [222, 217, 156],
          0.1,
          [204, 199, 130],
          0.125,
          [189, 184, 107],
          0.15,
          [176, 194, 97],
          0.175,
          [163, 204, 89],
          0.2,
          [145, 191, 82],
          0.25,
          [128, 179, 71],
          0.3,
          [112, 163, 64],
          0.35,
          [97, 150, 54],
          0.4,
          [79, 138, 46],
          0.45,
          [64, 125, 36],
          0.5,
          [48, 110, 28],
          0.55,
          [33, 97, 18],
          0.6,
          [15, 84, 10],
          0.65,
          [0, 69, 0],
        ],
      },
      source: new GeoTIFF({
        sources: [
          {
            // visible red, band 1 in the style expression above
            url:
              'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/2020/S2A_36QWD_20200701_0_L2A/B04.tif',
            nodata: 0,
            max: 10000,
          },
          {
            // near infrared, band 2 in the style expression above
            url:
              'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/2020/S2A_36QWD_20200701_0_L2A/B08.tif',
            nodata: 0,
            max: 10000,
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
