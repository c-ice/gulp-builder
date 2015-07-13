var PLUGIN_NAME = 'gulp-builder';
var fs = require('fs');
var path = require('path');
var blocksBuilder = require('./blocksBuilder.js');
var gutil = require('gulp-util');
var Q = require('q');
var extend = require('util')._extend
var through = require('through2');
var magenta = gutil.colors.magenta;
var cyan = gutil.colors.cyan;
var red = gutil.colors.red;

var DEBUGGING = false;

module.exports = function (options) {
    var html = [];
    var defaultOptions = {
        js: jsTransformer,
        css: cssTransformer,
        replace: replaceTransformer,
		include: includeContentTransformer,
        debug: false
    };

    log('debug');

    options = options || {};
    var opts = extend({}, defaultOptions);
    opts = extend(opts, options);

    DEBUGGING = opts.debug;

    log('Start debugging ' + PLUGIN_NAME);

    log(opts);

    return through.obj(function (file, enc, callback) {
        if (file.isStream()) {
            this.emit('error', error('Streams are not supported!'));
            callback();
        }
        else if (file.isNull()) {
            warn('File is null');
            callback(null, file); // Do nothing if no contents
        } else {
            try {
                var basePath = file.base;
                var name = path.basename(file.path);
                var mainPath = path.dirname(file.path);

                var buildedBlocks = builder(file, opts);

                buildedBlocks.then(function () {
                    var newContent = html.join('');

                    log('----------------- joined: -------------------');
                    log(newContent);

                    var newFile = new gutil.File({
                        path: file.path,
                        contents: new Buffer(newContent)
                    });

                    callback(null, newFile);
                });

                //var blocks = blocksBuilder(file, options);
                //htmlBuilder(file, blocks, options, this.push.bind(this), callback);
            } catch (e) {
                this.emit('error', e);
                callback();
            }
        }
    });

    function builder(file, opts) {
        var content = file.contents.toString();
        var blocks = blocksBuilder(content);

        var promises = blocks.map(function (block, i) {
            return Q.Promise(function (resolve) {
                if (typeof block === 'string') {
                    html[i] = block;
                    resolve();
                    return;
                }

                var transformAction = opts[block.action];

                if (typeof transformAction === 'function') {
                    html[i] = transformAction(block);
                    log(html[i]);
                    resolve();
                } else {
                    warn('not found transform action for: ' + block.action);
                    log(block);
                    warn('using default (replace) action.');
                    html[i] = replaceTransformer(block);
                    resolve();
                }
            });
        });


        return Q.all(promises).then(function () {
            log(html);
        });
    }
};

module.exports.transformBlock = replaceTransformer;

module.exports.getDir = function (block) {
    return path.dirname(block.nameInHTML);
};

function jsTransformer(block) {
    //var stream = gulp.src(block.files)
    //    .pipe(concat(block.name))
    //    .pipe(uglify())
    //    .pipe(gulp.dest(this.getDirPath(block.nameInHTML)));

    return replaceTransformer(block);
}

function cssTransformer(block) {
    //var stream = gulp.src(block.files)
    //    .pipe(concat(block.name))
    //    .pipe(minifyCss())
    //    .pipe(gulp.dest(this.getDirPath(block.nameInHTML)));

    //todo media query
    return replaceTransformer(block);
}

function replaceTransformer(block) {
    if (block.type === 'js') {
        return '<script src="' + block.nameInHTML + '"></script>';
    } else {
        return '<link rel="stylesheet" href="' + block.nameInHTML + '"'
             + (block.mediaQuery ? ' media="' + block.mediaQuery + '"' : '') + '/>';
    }
}

function includeContentTransformer(block) {
    var fileContent = '';
    var _filePath = path.normalize('./'+block.nameInHTML);

    log('Getting content: ' + _filePath);
    if (fs.existsSync(_filePath)) {
        fileContent = fread(_filePath);
        log(fileContent);
    }
	
    return fileContent;
}

function log(message) {
    if (DEBUGGING) {
        gutil.log(magenta(PLUGIN_NAME), message);
    }
}

function warn(message) {
    log(red('WARNING') + ' ' + message);
}

function error(message) {
    return new PluginError(PLUGIN_NAME, message);
}

function djoin(p) {
    return path.normalize(path.join(__dirname, p));
}
function fread(f) {
    return fs.readFileSync(f, { encoding: 'utf-8' });
}
