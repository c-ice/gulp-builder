var fs = require('fs');
var glob = require('glob');
var path = require('path');
var gutil = require('gulp-util');

var PLUGIN_NAME = 'gulp-builder';

module.exports = function (file, options) {
    options = options || {};

    var startReg = /<!--\s*build:(\w+)(?:(?:\(([^\)]+?)\))?\s+(\/?([^\s]+?))?)?\s*-->/gim;
    var endReg = /<!--\s*endbuild\s*-->/gim;
    var jsReg = /<\s*script\s+.*?src\s*=\s*("|')([^"']+?)\1.*?><\s*\/\s*script\s*>/gi;
    var cssReg = /<\s*link\s+.*?href\s*=\s*("|')([^"']+)\1.*?>/gi;
    var cssMediaReg = /<\s*link\s+.*?media\s*=\s*("|')([^"']+)\1.*?>/gi;
    var startCondReg = /<!--\[[^\]]+\]>/gim;
    var endCondReg = /<!\[endif\]-->/gim;

    if (typeof file !== 'string') {
        throw new gutil.PluginError(PLUGIN_NAME, 'incompatible file content.');
    }

    var content = file;
    var sections = content.split(endReg);
    var blocks = [];
    var cssMediaQuery = null;

    function getFiles(content, reg, alternatePath) {
        var paths = [];
        var files = [];
        cssMediaQuery = null;

        content
          .replace(startCondReg, '')
          .replace(endCondReg, '')
          .replace(/<!--(?:(?:.|\r|\n)*?)-->/gim, function (a) {
              return options.enableHtmlComment ? a : '';
          })
          .replace(reg, function (a, quote, b) {
              var filePath = path.normalize(b);

              paths.push(filePath);
          });

        if (reg === cssReg) {
            content.replace(cssMediaReg, function (a, quote, media) {
                if (!cssMediaQuery) {
                    cssMediaQuery = media;
                } else {
                    if (cssMediaQuery != media)
                        throw new gutil.PluginError(PLUGIN_NAME, 'incompatible css media query for ' + a + ' detected.');
                }
            });
        }



        return paths;
    }

    for (var i = 0, l = sections.length; i < l; ++i) {
        if (sections[i].match(startReg)) {
            var section = sections[i].split(startReg);

            blocks.push(section[0]);

            var startCondLine = section[5].match(startCondReg);
            var endCondLine = section[5].match(endCondReg);
            if (startCondLine && endCondLine)
                blocks.push(startCondLine[0]);

            if (section[1] !== 'remove') {
                if (jsReg.test(section[5])) {
                    blocks.push({
                        type: 'js',
                        action: section[1],
                        nameInHTML: section[3],
                        name: section[4],
                        files: getFiles(section[5], jsReg, section[2]),
                        tasks: options[section[1]]
                    });
                } else {
                    blocks.push({
                        type: 'css',
                        action: section[1],
                        nameInHTML: section[3],
                        name: section[4],
                        files: getFiles(section[5], cssReg, section[2]),
                        tasks: options[section[1]],
                        mediaQuery: cssMediaQuery
                    });
                }
            }

            if (startCondLine && endCondLine)
                blocks.push(endCondLine[0]);
        } else
            blocks.push(sections[i]);
    }

    return blocks;
};
