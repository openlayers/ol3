import GeoTIFF from '../src/ol/source/GeoTIFF.js';
import Map from '../src/ol/Map.js';
import Projection from '../src/ol/proj/Projection.js';
import TileLayer from '../src/ol/layer/WebGLTile.js';
import View from '../src/ol/View.js';
import proj4 from 'proj4';
import {getCenter} from '../src/ol/extent.js';
import {register} from '../src/ol/proj/proj4.js';

proj4.defs('EPSG:32645', '+proj=utm +zone=45 +datum=WGS84 +units=m +no_defs');
register(proj4);

const projection = new Projection({
  code: 'EPSG:32645',
  extent: [166021.44, 0.0, 534994.66, 9329005.18],
});

const sourceExtent = [382200, 2279370, 610530, 2512500];

const base =
  'https://landsat-pds.s3.amazonaws.com/c1/L8/139/045/LC08_L1TP_139045_20170304_20170316_01_T1/LC08_L1TP_139045_20170304_20170316_01_T1';

// scale values in this range to 0 - 1
const min = 10000;
const max = 15000;

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      extent: sourceExtent,
      style: {
        saturation: -0.3,
      },
      source: new GeoTIFF({
        sources: [
          {
            url: `${base}_B6.TIF`,
            overviews: [`${base}_B6.TIF.ovr`],
            min: min,
            max: max,
            nodata: 0,
          },
          {
            url: `${base}_B5.TIF`,
            overviews: [`${base}_B5.TIF.ovr`],
            min: min,
            max: max,
            nodata: 0,
          },
          {
            url: `${base}_B3.TIF`,
            overviews: [`${base}_B3.TIF.ovr`],
            min: min,
            max: max,
            nodata: 0,
          },
        ],
      }),
    }),
  ],
  view: new View({
    center: getCenter(sourceExtent),
    extent: sourceExtent,
    zoom: 8,
    projection: projection,
  }),
});
