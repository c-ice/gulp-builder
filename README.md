# gulp-builder

## Install 

```sh
npm install --save-dev git+http://github.com/c-ice/gulp-builder.git
```
### Example

**The target file `index.html`:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>My index</title>
</head>
<body>
    <!-- .... -->
    <!-- build:components components.min.js -->
    <script src="//localhost:8080/Scripts/chosen/chosen.jquery.js"></script>
    <script src="//localhost:8080/Scripts/angular-chosen/chosen.js"></script>
    <!-- endbuild -->

    <!-- .... -->

    <!-- build:js app.min.js -->
    <script src="app.js"></script>
    <script src="module1.js"></script>
    <script src="module2.js"></script>
    <!-- .... -->
    <!-- endbuild -->
</body>
</html>
```
**The `gulpfile.js`:**
```javascript
var gulp = require('gulp');
var debug = require('gulp-debug');
var builder = require('gulp-builder');
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');

var debugCDN = '//localhost:8080/'
var currentCDN = '//cdn.cdn.com/lol/'

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

/**
 * second parameters is resolve function this is good for long async tasks.
 */
function jsBuild(block, resolve) {
    var through = require('through2');

    var stream = gulp.src(block.files)
        .pipe(debug(block.name))
        .pipe(concat(block.name))
        .pipe(uglify())
        .pipe(gulp.dest('./build/'))
        .pipe(through.obj(function(chunk, enc, cb) {
          resolve();
          cb(null, chunk);
        }));

    return builder.transformBlock(block);
}
```
