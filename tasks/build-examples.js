var path = require('path');

var Metalsmith = require('metalsmith');
var handlebars = require('handlebars');
var templates = require('metalsmith-templates');
var marked = require('marked');
var pkg = require('../package.json');

// The regex to replace … goog.require … and … renderer: exampleNS. … lines
var cleanLineRegEx = /.*(goog\.require(.*);|.*renderer: exampleNS\..*,?)[\n]*/g;
// The regex to replace inline type casts
//
// We capture a total of 1 group that consist of the following parts: the start
// of a multiline comment, an optional space, the @-sign, 'type', a space,
// opening curly brackets, any non-whitespace characters, closing curly brace,
// an optional space, the end of a multiline comment followed by any number of
// whitespace characters
var cleanTypecastRegEx = /(\/\*\* ?@type \{\S*\} ?\*\/\s*)/g;

var markupRegEx = /([^\/^\.]*)\.html$/;
var isCssRegEx = /\.css$/;
var isJsRegEx = /\.js$/;

var srcDir = path.join(__dirname, '..', 'examples_src');
var destDir = path.join(__dirname, '..', 'examples');
var templatesDir = path.join(__dirname, '..', 'config', 'examples');


/**
 * Cleans the passed JavaScript source from
 *   * … goog.require … lines
 *   * … renderer: exampleNS. … lines
 *   * inline type casts
 *
 * @param {String} src The JavaScript source to cleanup.
 * @returns {String} The cleaned JavaScript source.
 */
function cleanupScriptSource(src) {
  src = src.replace(cleanLineRegEx, '');
  src = src.replace(cleanTypecastRegEx, '');
  return src;
}

/**
 * A Metalsmith plugin that adds metadata to the example HTML files.  For each
 * example HTML file, this adds metadata for related js and css resources. When
 * these files are run through the example template, the extra metadata is used
 * to show the complete example source in the textarea and submit the parts to
 * jsFiddle.
 *
 * @param {Object} files The file lookup provided by Metalsmith.  Property names
 *     are file paths relative to the source directory.  The file objects
 *     include any existing metadata (e.g. from YAML front-matter), the file
 *     contents, and stats.
 * @param {Object} metalsmith The metalsmith instance the plugin is being used
 *     with.
 * @param {function(Error)} done Called when done (with any error).
 */
function augmentExamples(files, metalsmith, done) {
  setImmediate(done); // all remaining code is synchronous
  for (var filename in files) {
    var file = files[filename];
    var match = filename.match(markupRegEx);
    if (match && filename !== 'index.html') {
      if (!file.template) {
        throw new Error(filename + ': Missing template in YAML front-matter');
      }
      var id = match[1];

      // add js tag and source
      var jsFilename = id + '.js';
      if (!(jsFilename in files)) {
        throw new Error('No .js file found for ' + filename);
      }
      file.js = {
        tag: '<script src="loader.js?id=' + id + '"></script>',
        source: cleanupScriptSource(files[jsFilename].contents.toString())
      };

      // add css tag and source
      var cssFilename = id + '.css';
      if (cssFilename in files) {
        file.css = {
          tag: '<link rel="stylesheet" href="' + cssFilename + '">',
          source: files[cssFilename].contents.toString()
        };
      }

      // add additional resources
      if (file.resources) {
        var resources = [];
        for (var i = 0, ii = file.resources.length; i < ii; ++i) {
          var resource = file.resources[i];
          if (isJsRegEx.test(resource)) {
            resources[i] = '<script src="' + resource + '"></script>';
          } else if (isCssRegEx.test(resource)) {
            resources[i] = '<link rel="stylesheet" href="' + resource + '">';
          } else {
            throw new Error('Invalid value for resource: ' +
                resource + ' is not .js or .css: ' + filename);
          }
        }
        file.extraHead = resources.join('\n');
      }
    }
  }
}

function main(callback) {
  new Metalsmith('.')
      .source(srcDir)
      .destination(destDir)
      .metadata({
        olVersion: pkg.version
      })
      .use(augmentExamples)
      .use(templates({
        engine: 'handlebars',
        directory: templatesDir,
        helpers: {
          md: function(str) {
            return new handlebars.SafeString(marked(str));
          }
        }
      }))
      .build(function(err) {
        callback(err);
      });
}

if (require.main === module) {
  main(function(err) {
    if (err) {
      process.stderr.write(err.message + '\n');
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}

module.exports = main;
