/**
 * @module ol/renderer/canvas/VectorLayer
 */
import {getUid, inherits} from '../../index.js';
import LayerType from '../../LayerType.js';
import ViewHint from '../../ViewHint.js';
import {createCanvasContext2D} from '../../dom.js';
import {listen, unlisten} from '../../events.js';
import EventType from '../../events/EventType.js';
import rbush from 'rbush';
import {buffer, createEmpty, containsExtent, getWidth} from '../../extent.js';
import RenderEventType from '../../render/EventType.js';
import {labelCache, rotateAtOffset} from '../../render/canvas.js';
import CanvasReplayGroup from '../../render/canvas/ReplayGroup.js';
import RendererType from '../Type.js';
import CanvasLayerRenderer from '../canvas/Layer.js';
import {defaultOrder as defaultRenderOrder, getTolerance as getRenderTolerance, getSquaredTolerance as getSquaredRenderTolerance, renderFeature} from '../vector.js';

/**
 * @constructor
 * @extends {ol.renderer.canvas.Layer}
 * @param {ol.layer.Vector} vectorLayer Vector layer.
 * @api
 */
const CanvasVectorLayerRenderer = function(vectorLayer) {

  CanvasLayerRenderer.call(this, vectorLayer);

  /**
   * Declutter tree.
   * @private
   */
  this.declutterTree_ = vectorLayer.getDeclutter() ? rbush(9) : null;

  /**
   * @private
   * @type {boolean}
   */
  this.dirty_ = false;

  /**
   * @type {number}
   */
  this.renderedRevision = -1;

  /**
   * @type {number}
   */
  this.renderedResolution = NaN;

  /**
   * @type {module:ol/extent~Extent}
   */
  this.renderedExtent = createEmpty();

  /**
   * @private
   * @type {function(ol.Feature, ol.Feature): number|null}
   */
  this.renderedRenderOrder_ = null;

  /**
   * @type {ol.render.canvas.ReplayGroup}
   */
  this.replayGroup = null;

  /**
   * A new replay group had to be created by `prepareFrame()`
   * @type {boolean}
   */
  this.replayGroupChanged = true;

  /**
   * @type {CanvasRenderingContext2D}
   */
  this.context = createCanvasContext2D();

  listen(labelCache, EventType.CLEAR, this.handleFontsChanged_, this);

};

inherits(CanvasVectorLayerRenderer, CanvasLayerRenderer);


/**
 * Determine if this renderer handles the provided layer.
 * @param {ol.renderer.Type} type The renderer type.
 * @param {ol.layer.Layer} layer The candidate layer.
 * @return {boolean} The renderer can render the layer.
 */
CanvasVectorLayerRenderer['handles'] = function(type, layer) {
  return type === RendererType.CANVAS && layer.getType() === LayerType.VECTOR;
};


/**
 * Create a layer renderer.
 * @param {ol.renderer.Map} mapRenderer The map renderer.
 * @param {ol.layer.Layer} layer The layer to be rendererd.
 * @return {ol.renderer.canvas.VectorLayer} The layer renderer.
 */
CanvasVectorLayerRenderer['create'] = function(mapRenderer, layer) {
  return new CanvasVectorLayerRenderer(/** @type {ol.layer.Vector} */ (layer));
};


/**
 * @inheritDoc
 */
CanvasVectorLayerRenderer.prototype.disposeInternal = function() {
  unlisten(labelCache, EventType.CLEAR, this.handleFontsChanged_, this);
  CanvasLayerRenderer.prototype.disposeInternal.call(this);
};


/**
 * @inheritDoc
 */
CanvasVectorLayerRenderer.prototype.composeFrame = function(frameState, layerState, context) {

  const extent = frameState.extent;
  const pixelRatio = frameState.pixelRatio;
  const skippedFeatureUids = layerState.managed ?
    frameState.skippedFeatureUids : {};
  const viewState = frameState.viewState;
  const projection = viewState.projection;
  const rotation = viewState.rotation;
  const projectionExtent = projection.getExtent();
  const vectorSource = /** @type {ol.source.Vector} */ (this.getLayer().getSource());

  let transform = this.getTransform(frameState, 0);

  this.preCompose(context, frameState, transform);

  // clipped rendering if layer extent is set
  const clipExtent = layerState.extent;
  const clipped = clipExtent !== undefined;
  if (clipped) {
    this.clip(context, frameState,  /** @type {module:ol/extent~Extent} */ (clipExtent));
  }
  const replayGroup = this.replayGroup;
  if (replayGroup && !replayGroup.isEmpty()) {
    if (this.declutterTree_) {
      this.declutterTree_.clear();
    }
    const layer = /** @type {ol.layer.Vector} */ (this.getLayer());
    let drawOffsetX = 0;
    let drawOffsetY = 0;
    let replayContext;
    const transparentLayer = layerState.opacity !== 1;
    const hasRenderListeners = layer.hasListener(RenderEventType.RENDER);
    if (transparentLayer || hasRenderListeners) {
      let drawWidth = context.canvas.width;
      let drawHeight = context.canvas.height;
      if (rotation) {
        const drawSize = Math.round(Math.sqrt(drawWidth * drawWidth + drawHeight * drawHeight));
        drawOffsetX = (drawSize - drawWidth) / 2;
        drawOffsetY = (drawSize - drawHeight) / 2;
        drawWidth = drawHeight = drawSize;
      }
      // resize and clear
      this.context.canvas.width = drawWidth;
      this.context.canvas.height = drawHeight;
      replayContext = this.context;
    } else {
      replayContext = context;
    }

    const alpha = replayContext.globalAlpha;
    if (!transparentLayer) {
      // for performance reasons, context.save / context.restore is not used
      // to save and restore the transformation matrix and the opacity.
      // see http://jsperf.com/context-save-restore-versus-variable
      replayContext.globalAlpha = layerState.opacity;
    }

    if (replayContext != context) {
      replayContext.translate(drawOffsetX, drawOffsetY);
    }

    const width = frameState.size[0] * pixelRatio;
    const height = frameState.size[1] * pixelRatio;
    rotateAtOffset(replayContext, -rotation,
      width / 2, height / 2);
    replayGroup.replay(replayContext, transform, rotation, skippedFeatureUids);
    if (vectorSource.getWrapX() && projection.canWrapX() &&
        !containsExtent(projectionExtent, extent)) {
      let startX = extent[0];
      const worldWidth = getWidth(projectionExtent);
      let world = 0;
      let offsetX;
      while (startX < projectionExtent[0]) {
        --world;
        offsetX = worldWidth * world;
        transform = this.getTransform(frameState, offsetX);
        replayGroup.replay(replayContext, transform, rotation, skippedFeatureUids);
        startX += worldWidth;
      }
      world = 0;
      startX = extent[2];
      while (startX > projectionExtent[2]) {
        ++world;
        offsetX = worldWidth * world;
        transform = this.getTransform(frameState, offsetX);
        replayGroup.replay(replayContext, transform, rotation, skippedFeatureUids);
        startX -= worldWidth;
      }
      // restore original transform for render and compose events
      transform = this.getTransform(frameState, 0);
    }
    rotateAtOffset(replayContext, rotation,
      width / 2, height / 2);

    if (replayContext != context) {
      if (hasRenderListeners) {
        this.dispatchRenderEvent(replayContext, frameState, transform);
      }
      if (transparentLayer) {
        const mainContextAlpha = context.globalAlpha;
        context.globalAlpha = layerState.opacity;
        context.drawImage(replayContext.canvas, -drawOffsetX, -drawOffsetY);
        context.globalAlpha = mainContextAlpha;
      } else {
        context.drawImage(replayContext.canvas, -drawOffsetX, -drawOffsetY);
      }
      replayContext.translate(-drawOffsetX, -drawOffsetY);
    }

    if (!transparentLayer) {
      replayContext.globalAlpha = alpha;
    }
  }

  if (clipped) {
    context.restore();
  }
  this.postCompose(context, frameState, layerState, transform);

};


/**
 * @inheritDoc
 */
CanvasVectorLayerRenderer.prototype.forEachFeatureAtCoordinate = function(coordinate, frameState, hitTolerance, callback, thisArg) {
  if (!this.replayGroup) {
    return undefined;
  } else {
    const resolution = frameState.viewState.resolution;
    const rotation = frameState.viewState.rotation;
    const layer = /** @type {ol.layer.Vector} */ (this.getLayer());
    /** @type {!Object.<string, boolean>} */
    const features = {};
    const result = this.replayGroup.forEachFeatureAtCoordinate(coordinate, resolution, rotation, hitTolerance, {},
      /**
       * @param {ol.Feature|ol.render.Feature} feature Feature.
       * @return {?} Callback result.
       */
      function(feature) {
        const key = getUid(feature).toString();
        if (!(key in features)) {
          features[key] = true;
          return callback.call(thisArg, feature, layer);
        }
      }, null);
    return result;
  }
};


/**
 * @param {ol.events.Event} event Event.
 */
CanvasVectorLayerRenderer.prototype.handleFontsChanged_ = function(event) {
  const layer = this.getLayer();
  if (layer.getVisible() && this.replayGroup) {
    layer.changed();
  }
};


/**
 * Handle changes in image style state.
 * @param {ol.events.Event} event Image style change event.
 * @private
 */
CanvasVectorLayerRenderer.prototype.handleStyleImageChange_ = function(event) {
  this.renderIfReadyAndVisible();
};


/**
 * @inheritDoc
 */
CanvasVectorLayerRenderer.prototype.prepareFrame = function(frameState, layerState) {
  const vectorLayer = /** @type {ol.layer.Vector} */ (this.getLayer());
  const vectorSource = vectorLayer.getSource();

  const animating = frameState.viewHints[ViewHint.ANIMATING];
  const interacting = frameState.viewHints[ViewHint.INTERACTING];
  const updateWhileAnimating = vectorLayer.getUpdateWhileAnimating();
  const updateWhileInteracting = vectorLayer.getUpdateWhileInteracting();

  if (!this.dirty_ && (!updateWhileAnimating && animating) ||
      (!updateWhileInteracting && interacting)) {
    return true;
  }

  const frameStateExtent = frameState.extent;
  const viewState = frameState.viewState;
  const projection = viewState.projection;
  const resolution = viewState.resolution;
  const pixelRatio = frameState.pixelRatio;
  const vectorLayerRevision = vectorLayer.getRevision();
  const vectorLayerRenderBuffer = vectorLayer.getRenderBuffer();
  let vectorLayerRenderOrder = vectorLayer.getRenderOrder();

  if (vectorLayerRenderOrder === undefined) {
    vectorLayerRenderOrder = defaultRenderOrder;
  }

  const extent = buffer(frameStateExtent,
    vectorLayerRenderBuffer * resolution);
  const projectionExtent = viewState.projection.getExtent();

  if (vectorSource.getWrapX() && viewState.projection.canWrapX() &&
      !containsExtent(projectionExtent, frameState.extent)) {
    // For the replay group, we need an extent that intersects the real world
    // (-180° to +180°). To support geometries in a coordinate range from -540°
    // to +540°, we add at least 1 world width on each side of the projection
    // extent. If the viewport is wider than the world, we need to add half of
    // the viewport width to make sure we cover the whole viewport.
    const worldWidth = getWidth(projectionExtent);
    const gutter = Math.max(getWidth(extent) / 2, worldWidth);
    extent[0] = projectionExtent[0] - gutter;
    extent[2] = projectionExtent[2] + gutter;
  }

  if (!this.dirty_ &&
      this.renderedResolution == resolution &&
      this.renderedRevision == vectorLayerRevision &&
      this.renderedRenderOrder_ == vectorLayerRenderOrder &&
      containsExtent(this.renderedExtent, extent)) {
    this.replayGroupChanged = false;
    return true;
  }

  this.replayGroup = null;

  this.dirty_ = false;

  const replayGroup = new CanvasReplayGroup(
    getRenderTolerance(resolution, pixelRatio), extent, resolution,
    pixelRatio, vectorSource.getOverlaps(), this.declutterTree_, vectorLayer.getRenderBuffer());
  vectorSource.loadFeatures(extent, resolution, projection);
  /**
   * @param {ol.Feature} feature Feature.
   * @this {ol.renderer.canvas.VectorLayer}
   */
  const render = function(feature) {
    let styles;
    const styleFunction = feature.getStyleFunction() || vectorLayer.getStyleFunction();
    if (styleFunction) {
      styles = styleFunction(feature, resolution);
    }
    if (styles) {
      const dirty = this.renderFeature(
        feature, resolution, pixelRatio, styles, replayGroup);
      this.dirty_ = this.dirty_ || dirty;
    }
  }.bind(this);
  if (vectorLayerRenderOrder) {
    /** @type {Array.<ol.Feature>} */
    const features = [];
    vectorSource.forEachFeatureInExtent(extent,
      /**
       * @param {ol.Feature} feature Feature.
       */
      function(feature) {
        features.push(feature);
      }, this);
    features.sort(vectorLayerRenderOrder);
    for (let i = 0, ii = features.length; i < ii; ++i) {
      render(features[i]);
    }
  } else {
    vectorSource.forEachFeatureInExtent(extent, render, this);
  }
  replayGroup.finish();

  this.renderedResolution = resolution;
  this.renderedRevision = vectorLayerRevision;
  this.renderedRenderOrder_ = vectorLayerRenderOrder;
  this.renderedExtent = extent;
  this.replayGroup = replayGroup;

  this.replayGroupChanged = true;
  return true;
};


/**
 * @param {ol.Feature} feature Feature.
 * @param {number} resolution Resolution.
 * @param {number} pixelRatio Pixel ratio.
 * @param {(ol.style.Style|Array.<ol.style.Style>)} styles The style or array of
 *     styles.
 * @param {ol.render.canvas.ReplayGroup} replayGroup Replay group.
 * @return {boolean} `true` if an image is loading.
 */
CanvasVectorLayerRenderer.prototype.renderFeature = function(feature, resolution, pixelRatio, styles, replayGroup) {
  if (!styles) {
    return false;
  }
  let loading = false;
  if (Array.isArray(styles)) {
    for (let i = 0, ii = styles.length; i < ii; ++i) {
      loading = renderFeature(
        replayGroup, feature, styles[i],
        getSquaredRenderTolerance(resolution, pixelRatio),
        this.handleStyleImageChange_, this) || loading;
    }
  } else {
    loading = renderFeature(
      replayGroup, feature, styles,
      getSquaredRenderTolerance(resolution, pixelRatio),
      this.handleStyleImageChange_, this);
  }
  return loading;
};
export default CanvasVectorLayerRenderer;
