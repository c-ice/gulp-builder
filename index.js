var PLUGIN_NAME = 'gulp-builder';
var fs = require('fs');
var path = require('path');
var blocksBuilder = require('./blocksBuilder.js');
var gutil = require('gulp-util');
var Q = require('q');
var extend = require('util')._extend
var through = require('through2');


module.exports = function (options) {
    var html = [];
    var defaultOptions = {
        js: jsTransformer,
        css: cssTransformer,
        replace: replaceTransformer
    };

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

                var buildedBlocks = builder(file, options);

                buildedBlocks.then(function () {
                    var newContent = html.join('');
                    console.log(newContent);

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

    function djoin(p) {
        return path.normalize(path.join(__dirname, p));
    }
    function fread(f) {
        return fs.readFileSync(f, { encoding: 'utf-8' });
    }

    function builder(file, options) {
        options = options || {};
        var opts = extend({}, defaultOptions);
        extend(opts, options);

        var content = file.contents.toString();
        var blocks = blocksBuilder(content);

        this.getDirPath = function (filepath) {
            var obj = path.parse(filepath);

            return obj ? obj.dir : '';
        }

        var promises = blocks.map(function (block, i) {
            return Q.Promise(function (resolve) {
                if (typeof block == 'string') {
                    html[i] = block;
                    resolve();
                }

                var transformAction = opts[block.action];

                if (typeof transformAction === 'function') {
                    html[i] = transformAction.call(this, block);
                    resolve();
                } else {
                    throw error('not found transform action for: ' + block.action);
                }
            });
        });

        return Q.all(promises).then(function () {
            console.log(html);
        });;
    }
};

function jsTransformer(block) {
    var stream = gulp.src(block.files)
        .pipe(concat(block.name))
        .pipe(uglify())
        .pipe(gulp.dest(this.getDirPath(block.nameInHTML)));

    return replaceTransformer(block);
}

function cssTransformer(block) {
    var stream = gulp.src(block.files)
        .pipe(concat(block.name))
        .pipe(minifyCss())
        .pipe(gulp.dest(this.getDirPath(block.nameInHTML)));

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

function log(message) {
    gutil.log(magenta(PLUGIN_NAME), message);
}

function warn(message) {
    log(red('WARNING') + ' ' + message);
}

function error(message) {
    return new PluginError(PLUGIN_NAME, message);
}