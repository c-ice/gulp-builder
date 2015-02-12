var gulp = require('gulp');
var debug = require('gulp-debug');
var builder = require('./../index.js');
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');

var debugCDN = '//localhost:8080/'
var currentCDN = '//trololo.cdn.sk/BC/'

var options = {
    debug: false,
    components: function (block) {
        var newUrl = currentCDN + block.nameInHTML;

        return '<script src="' + newUrl + '"></script>';
    },
    app: jsBuild,
    vendorjs: jsBuild
};

//gutil.log(builder);

gulp.src('./index.html')
    .pipe(builder(options))
    .pipe(gulp.dest('./build/'));


function jsBuild(block) {
    //gutil.log(block);

    var stream = gulp.src(block.files)
        .pipe(debug(block.name))
        .pipe(concat(block.name))
        .pipe(uglify())
        .pipe(gulp.dest('./build/'))

    return builder.transformBlock(block);
}