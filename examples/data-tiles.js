import DataTile from '../src/ol/source/DataTile.js';
import Map from '../src/ol/Map.js';
import TileLayer from '../src/ol/layer/WebGLTile.js';
import View from '../src/ol/View.js';

const size = 256;

const canvas = document.createElement('canvas');
canvas.width = size;
canvas.height = size;

const context = canvas.getContext('2d');
context.strokeStyle = 'white';
context.textAlign = 'center';
context.font = '24px sans-serif';
const lineHeight = 30;

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new DataTile({
        loader: function (z, x, y) {
          const half = size / 2;
          context.clearRect(0, 0, size, size);
          context.fillStyle = 'rgba(100, 100, 100, 0.5)';
          context.fillRect(0, 0, size, size);
          context.fillStyle = 'black';
          context.fillText(`z: ${z}`, half, half - lineHeight);
          context.fillText(`x: ${x}`, half, half);
          context.fillText(`y: ${y}`, half, half + lineHeight);
          context.strokeRect(0, 0, size, size);
          const data = context.getImageData(0, 0, size, size).data;
          return Promise.resolve(data);
        },
      }),
    }),
  ],
  view: new View({
    center: [0, 0],
    zoom: 0,
  }),
});
