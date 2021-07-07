/**
 * @module ol/source/GeoTIFF
 */
import DataTile from './DataTile.js';
import State from './State.js';
import TileGrid from '../tilegrid/TileGrid.js';
import {get as getProjection} from '../proj.js';
import {fromUrl as tiffFromUrl, fromUrls as tiffFromUrls} from 'geotiff';
import {toSize} from '../size.js';

/**
 * @typedef SourceInfo
 * @property {string} url URL for the source.
 * @property {Array<string>} [overviews] List of any overview URLs.
 * @property {number} [min=0] The minimum source data value.  Rendered values are scaled from 0 to 1 based on
 * the configured min and max.
 * @property {number} [max] The maximum source data value.  Rendered values are scaled from 0 to 1 based on
 * the configured min and max.
 * @property {number} [nodata] Values to discard.
 */

/**
 * @param {import("geotiff/src/geotiff.js").GeoTIFF|import("geotiff/src/geotiff.js").MultiGeoTIFF} tiff A GeoTIFF.
 * @return {Promise<Array<import("geotiff/src/geotiffimage.js").GeoTIFFImage>>} Resolves to a list of images.
 */
function getImagesForTIFF(tiff) {
  return tiff.getImageCount().then(function (count) {
    const requests = new Array(count);
    for (let i = 0; i < count; ++i) {
      requests[i] = tiff.getImage(i);
    }
    return Promise.all(requests);
  });
}

/**
 * @param {SourceInfo} source The GeoTIFF source.
 * @return {Promise<Array<import("geotiff/src/geotiffimage.js").GeoTIFFImage>>} Resolves to a list of images.
 */
function getImagesForSource(source) {
  let request;
  if (source.overviews) {
    request = tiffFromUrls(source.url, source.overviews);
  } else {
    request = tiffFromUrl(source.url);
  }
  return request.then(getImagesForTIFF);
}

/**
 * @param {number|Array<number>|Array<Array<number>>} expected Expected value.
 * @param {number|Array<number>|Array<Array<number>>} got Actual value.
 * @param {string} message The error message.
 */
function assertEqual(expected, got, message) {
  if (Array.isArray(expected)) {
    const length = expected.length;
    if (!Array.isArray(got) || length != got.length) {
      throw new Error(message);
    }
    for (let i = 0; i < length; ++i) {
      assertEqual(expected[i], got[i], message);
    }
    return;
  }

  if (expected !== got) {
    throw new Error(message);
  }
}

/**
 * @param {Array} array The data array.
 * @return {number} The minimum value.
 */
function getMinForDataType(array) {
  if (array instanceof Int8Array) {
    return -128;
  }
  if (array instanceof Int16Array) {
    return -32768;
  }
  if (array instanceof Int32Array) {
    return -2147483648;
  }
  if (array instanceof Float32Array) {
    return 1.2e-38;
  }
  return 0;
}

/**
 * @param {Array} array The data array.
 * @return {number} The maximum value.
 */
function getMaxForDataType(array) {
  if (array instanceof Int8Array) {
    return 127;
  }
  if (array instanceof Uint8Array) {
    return 255;
  }
  if (array instanceof Uint8ClampedArray) {
    return 255;
  }
  if (array instanceof Int16Array) {
    return 32767;
  }
  if (array instanceof Uint16Array) {
    return 65535;
  }
  if (array instanceof Int32Array) {
    return 2147483647;
  }
  if (array instanceof Uint32Array) {
    return 4294967295;
  }
  if (array instanceof Float32Array) {
    return 3.4e38;
  }
  return 255;
}

/**
 * @typedef Options
 * @property {Array<SourceInfo>} sources List of information about GeoTIFF sources.
 */

/**
 * @classdesc
 * A source for working with GeoTIFF data.
 */
class GeoTIFFSource extends DataTile {
  /**
   * @param {Options} options Image tile options.
   */
  constructor(options) {
    super({
      state: State.LOADING,
      tileGrid: null,
      projection: null,
    });

    /**
     * @type {Array<SourceInfo>}
     * @private
     */
    this.sourceInfo_ = options.sources;

    const numSources = this.sourceInfo_.length;

    /**
     * @type {Array<Array<import("geotiff/src/geotiffimage.js").GeoTIFFImage>>}
     * @private
     */
    this.sourceImagery_ = new Array(numSources);

    /**
     * @type {number}
     * @private
     */
    this.samplesPerPixel_;

    /**
     * @type {Error}
     * @private
     */
    this.error_ = null;

    const self = this;
    const requests = new Array(numSources);
    for (let i = 0; i < numSources; ++i) {
      requests[i] = getImagesForSource(this.sourceInfo_[i]);
    }
    Promise.all(requests)
      .then(function (sources) {
        self.configure_(sources);
      })
      .catch(function (error) {
        self.error_ = error;
        self.setState(State.ERROR);
      });
  }

  /**
   * @return {Error} A source loading error.
   */
  getError() {
    return this.error_;
  }

  /**
   * Configure the tile grid based on images within the source GeoTIFFs.  Each GeoTIFF
   * must have the same internal tiled structure.
   * @param {Array<Array<import("geotiff/src/geotiffimage.js").GeoTIFFImage>>} sources Each source is a list of images
   * from a single GeoTIFF.
   */
  configure_(sources) {
    let extent;
    let origin;
    let tileSizes;
    let resolutions;
    let samplesPerPixel;

    const sourceCount = sources.length;
    for (let sourceIndex = 0; sourceIndex < sourceCount; ++sourceIndex) {
      const images = sources[sourceIndex];
      const imageCount = images.length;

      let sourceExtent;
      let sourceOrigin;
      const sourceTileSizes = new Array(imageCount);
      const sourceResolutions = new Array(imageCount);

      for (let imageIndex = 0; imageIndex < imageCount; ++imageIndex) {
        const image = images[imageIndex];
        const imageSamplesPerPixel = image.getSamplesPerPixel();
        if (!samplesPerPixel) {
          samplesPerPixel = imageSamplesPerPixel;
        } else {
          const message = `Band count mismatch for source ${sourceIndex}, got ${imageSamplesPerPixel} but expected ${samplesPerPixel}`;
          assertEqual(samplesPerPixel, imageSamplesPerPixel, message);
        }
        const level = imageCount - (imageIndex + 1);

        if (!sourceExtent) {
          sourceExtent = image.getBoundingBox();
        }

        if (!sourceOrigin) {
          sourceOrigin = image.getOrigin().slice(0, 2);
        }

        sourceResolutions[level] = image.getResolution(images[0])[0];
        sourceTileSizes[level] = [image.getTileWidth(), image.getTileHeight()];
      }

      if (!extent) {
        extent = sourceExtent;
      } else {
        const message = `Extent mismatch for source ${sourceIndex}, got [${sourceExtent}] but expected [${extent}]`;
        assertEqual(extent, sourceExtent, message);
      }

      if (!origin) {
        origin = sourceOrigin;
      } else {
        const message = `Origin mismatch for source ${sourceIndex}, got [${sourceOrigin}] but expected [${origin}]`;
        assertEqual(origin, sourceOrigin, message);
      }

      if (!tileSizes) {
        tileSizes = sourceTileSizes;
      } else {
        assertEqual(
          tileSizes,
          sourceTileSizes,
          `Tile size mismatch for source ${sourceIndex}`
        );
      }

      if (!resolutions) {
        resolutions = sourceResolutions;
      } else {
        const message = `Resolution mismatch for source ${sourceIndex}, got [${sourceResolutions}] but expected [${resolutions}]`;
        assertEqual(resolutions, sourceResolutions, message);
      }

      this.sourceImagery_[sourceIndex] = images.reverse();
    }

    if (!this.getProjection()) {
      const firstImage = sources[0][0];
      if (firstImage.geoKeys) {
        const code =
          firstImage.geoKeys.ProjectedCSTypeGeoKey ||
          firstImage.geoKeys.GeographicTypeGeoKey;
        if (code) {
          this.projection = getProjection(`EPSG:${code}`);
        }
      }
    }

    if (sourceCount > 1 && samplesPerPixel !== 1) {
      throw new Error(
        'Expected single band GeoTIFFs when using multiple sources'
      );
    }

    this.samplesPerPixel_ = samplesPerPixel;

    const tileGrid = new TileGrid({
      extent: extent,
      origin: origin,
      resolutions: resolutions,
      tileSizes: tileSizes,
    });

    this.tileGrid = tileGrid;

    this.setLoader(this.loadTile_.bind(this));
    this.setState(State.READY);
  }

  loadTile_(z, x, y) {
    const size = toSize(this.tileGrid.getTileSize(z));
    const pixelBounds = [
      x * size[0],
      y * size[1],
      (x + 1) * size[0],
      (y + 1) * size[1],
    ];

    const sourceCount = this.sourceImagery_.length;
    const requests = new Array(sourceCount);
    let addAlpha = false;
    const sourceInfo = this.sourceInfo_;
    for (let sourceIndex = 0; sourceIndex < sourceCount; ++sourceIndex) {
      const image = this.sourceImagery_[sourceIndex][z];
      requests[sourceIndex] = image.readRasters({window: pixelBounds});
      if (sourceInfo[sourceIndex].nodata !== undefined) {
        addAlpha = true;
      }
    }

    const samplesPerPixel = this.samplesPerPixel_;
    let additionalBands = 0;
    if (addAlpha) {
      if (sourceCount === 2 && samplesPerPixel === 1) {
        additionalBands = 2;
      } else {
        additionalBands = 1;
      }
    }
    const bandCount = samplesPerPixel * sourceCount + additionalBands;
    const pixelCount = size[0] * size[1];
    const dataLength = pixelCount * bandCount;

    return Promise.all(requests).then(function (sourceSamples) {
      const data = new Uint8ClampedArray(dataLength);
      for (let pixelIndex = 0; pixelIndex < pixelCount; ++pixelIndex) {
        let transparent = addAlpha;
        const sourceOffset = pixelIndex * bandCount;
        for (let sourceIndex = 0; sourceIndex < sourceCount; ++sourceIndex) {
          const source = sourceInfo[sourceIndex];
          let min = source.min;
          if (min === undefined) {
            min = getMinForDataType(sourceSamples[sourceIndex][0]);
          }
          let max = source.max;
          if (max === undefined) {
            max = getMaxForDataType(sourceSamples[sourceIndex][0]);
          }

          const gain = 255 / (max - min);
          const bias = -min * gain;

          const nodata = source.nodata;

          const sampleOffset = sourceOffset + sourceIndex * samplesPerPixel;
          for (
            let sampleIndex = 0;
            sampleIndex < samplesPerPixel;
            ++sampleIndex
          ) {
            const sourceValue =
              sourceSamples[sourceIndex][sampleIndex][pixelIndex];

            const value = gain * sourceValue + bias;
            if (!addAlpha) {
              data[sampleOffset + sampleIndex] = value;
            } else {
              if (sourceValue !== nodata) {
                transparent = false;
                data[sampleOffset + sampleIndex] = value;
              }
            }
          }

          if (addAlpha && !transparent) {
            data[sampleOffset + samplesPerPixel] = 255;
          }
        }
      }

      return data;
    });
  }
}

export default GeoTIFFSource;
