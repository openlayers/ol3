// Karma configuration
// Generated on Tue Feb 03 2015 16:10:07 GMT+0000 (GMT Standard Time)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: "",


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'closure'],


    // list of files / patterns to load in the browser
    files: [
        // closure base
        {pattern: '../closure-library/closure/goog/base.js'},

        {pattern: '../closure-library/closure/goog/deps.js'},
        {pattern: '../plugins/popup/dist/webmappping-popup.deps.js'},
        {pattern: '../dist/webmapping-lib.deps.js'},
        //
        {pattern: 'test/**/*.js' },
        //{pattern: '../src/main.js'}
        //{pattern: 'ol.ext/rbush.js'},
        //{pattern: 'src/**/*.js'},
        //{pattern: '../plugins/popup/src/**/*.js'},
        //{pattern: '../src/**/*.js'},
        //


    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
        // tests are preprocessed for dependencies (closure) and for iits
        'test/**/*.js': ['closure'],
        //
        //// source files are preprocessed for dependencies
        //'ol.ext/rbush.js': ['closure'],
        'src/**/*.js': ['closure'],
        //'../plugins/popup/src/**/*.js':['closure'],
        //'../src/**/*.js':['closure'],
        //
        //// external deps
        '../closure-library/closure/goog/deps.js': ['closure-deps'],
        '../plugins/popup/dist/webmappping-popup.deps.js': ['closure-deps'],
        '../dist/webmapping-lib.deps.js' : ['closure-deps']

    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'], //, 'Firefox', 'PhantomJS'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
