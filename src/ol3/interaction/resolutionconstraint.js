goog.provide('ol3.interaction.ResolutionConstraint');
goog.provide('ol3.interaction.ResolutionConstraintType');

goog.require('goog.math');
goog.require('ol3.array');


/**
 * @typedef {function((number|undefined), number): (number|undefined)}
 */
ol3.interaction.ResolutionConstraintType;


/**
 * @param {number} power Power.
 * @param {number} maxResolution Maximum resolution.
 * @param {number=} opt_minResolution Minimum resolution.
 * @return {ol3.interaction.ResolutionConstraintType} Zoom function.
 */
ol3.interaction.ResolutionConstraint.createContinuous =
    function(power, maxResolution, opt_minResolution) {
  var minResolution = opt_minResolution || 0;
  return function(resolution, delta) {
    if (goog.isDef(resolution)) {
      resolution /= Math.pow(power, delta);
      return goog.math.clamp(resolution, minResolution, maxResolution);
    } else {
      return undefined;
    }
  };
};


/**
 * @param {Array.<number>} resolutions Resolutions.
 * @return {ol3.interaction.ResolutionConstraintType} Zoom function.
 */
ol3.interaction.ResolutionConstraint.createSnapToResolutions =
    function(resolutions) {
  return function(resolution, delta) {
    if (goog.isDef(resolution)) {
      var z = ol3.array.linearFindNearest(resolutions, resolution);
      z = goog.math.clamp(z + delta, 0, resolutions.length - 1);
      return resolutions[z];
    } else {
      return undefined;
    }
  };
};


/**
 * @param {number} power Power.
 * @param {number} maxResolution Maximum resolution.
 * @param {number=} opt_maxLevel Maximum level.
 * @return {ol3.interaction.ResolutionConstraintType} Zoom function.
 */
ol3.interaction.ResolutionConstraint.createSnapToPower =
    function(power, maxResolution, opt_maxLevel) {
  return function(resolution, delta) {
    if (goog.isDef(resolution)) {
      var oldLevel = Math.floor(
          Math.log(maxResolution / resolution) / Math.log(power) + 0.5);
      var newLevel = Math.max(oldLevel + delta, 0);
      if (goog.isDef(opt_maxLevel)) {
        newLevel = Math.min(newLevel, opt_maxLevel);
      }
      return maxResolution / Math.pow(power, newLevel);
    } else {
      return undefined;
    }
  };
};
