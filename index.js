var PLUGIN_NAME = 'gulp-builder';
var fs = require('fs');
var path = require('path');
var blocksBuilder = require('./blocksBuilder.js');
var gutil = require('gulp-util');
var Q = require('q');
var extend = require('util')._extend

function djoin(p) {
  return path.normalize(path.join(__dirname, p));
}
function fread(f) {
  return fs.readFileSync(f, { encoding: 'utf-8'});
}

var html = [];

function builder(options) {
	options = options || {};
	var opts = extend({},  defaultOptions);
	extend(opts,  options);
	
	var filepath =  opts.source || '../index.html';
	var content = fread(djoin(filepath));
	var blocks = blocksBuilder(content);
	
	this.getDirPath = function(filepath) {
		var obj = path.parse(filepath);
		
		return obj ? obj.dir : '';
	}

	var promises = blocks.map(function(block, i) {
    return Q.Promise(function(resolve) {
      if (typeof block == 'string') {
        html[i] = block;
        resolve();
      }
	  
	  var transformAction = opts[block.action];
	  
	  if (typeof transformAction === 'function') {
		  html[i] = transformAction.call(this, block);
		  resolve();
	  } else {
		  throw new gutil.PluginError(PLUGIN_NAME, 'not found transform action for: ' + block.action);
	  }
    });
  });

	return Q.all(promises).then(function() {
    console.log(html);
  });;
}

var buildedBlocks = builder({source: '../index.html', components: function(block){
	return '<script src="'+block.nameInHTML+'"></script>';
}});

buildedBlocks.then(function(){
	var newContent = html.join('');
	
	console.log(newContent);
});

var defaultOptions = {
	js: jsTransformer,
	css: cssTransformer
}

function jsTransformer(block) {
	var stream = gulp.src(block.files)
		.pipe(concat(block.name))
		.pipe(uglify())
		.pipe(gulp.dest(this.getDirPath(block.nameInHTML)));
	
	return '<script src="'+block.nameInHTML+'"></script>';
}

function cssTransformer(block) {
	var stream = gulp.src(block.files)
		.pipe(concat(block.name))
		.pipe(minifyCss())
		.pipe(gulp.dest(this.getDirPath(block.nameInHTML)));
	
	//todo media query
	return '<link href="'+block.nameInHTML+'" rel="stylesheet" />';
}
