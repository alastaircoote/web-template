require('coffee-script/register');

var gulp = require('gulp');
var requirejs = require('requirejs');
var path = require('path');
var less = require('gulp-less');
var coffee = require('gulp-coffee');
var rename = require('gulp-rename');
var clean = require('gulp-clean');
var liveReload = require('gulp-livereload');
var prefix = require('gulp-autoprefixer');
var plumber = require('gulp-plumber');
var minifyCss = require('gulp-minify-css');
var htmlReplace = require('gulp-html-replace');
var async = require('async');
var uglify = require('gulp-uglify');

var server = require("./src/server");

var srcPath = "public.src";

var paths = {
  less: srcPath + "/less/**/*.less",
  coffee: srcPath + "/coffee/**/*.*",
  templates: srcPath + "/templates/**/*.*",
  images: srcPath + "/images/**/*.*",
  fonts: srcPath + "/fonts/**/*.*",
  html: srcPath + "/index.html"
}

var outPath;

paths.staticPaths = [
  paths.images,
  paths.fonts
]

gulp.task('clean-watch', function () {
  return gulp.src(__dirname + "/public.tmp", {read: false})
    .pipe(clean());
});

gulp.task('watch', ['clean-watch'], function() {

  outPath = __dirname + "/public.tmp"

  process.on('SIGINT', function() {
    gulp.src(outPath, {read: false}).pipe(clean())
    .on("end", function() {
      console.log("Cleaned tmp folder.")
      return process.exit();
    })
  });


  var watchPlumber = function() {
    return plumber({
      errorHandler: function(err) {
        var notify = require('osx-notifier');
        try {
          notify({
            type:"fail",
            title:"Error in " + err.plugin,
            message: err.message
          })
        } catch (ex) {
          
        }
        console.log(err);
      }
    })
  }

  var processLess = function() {
    gulp.src(srcPath + "/less/main.less")
      .pipe(watchPlumber())
      .pipe(less({sourceMap:true}))
      .pipe(prefix("last 1 version", "> 1%", "ie 8"))
      .pipe(gulp.dest(path.join(outPath,'css')))
      .pipe(liveReload());
  }

  var processCoffee = function() {
    gulp.src(paths.coffee)
      .pipe(coffee({bare:true}))
      .pipe(gulp.dest(path.join(outPath,'js-tmp')))
      .on('end', function() {
        requirejs.optimize({
          baseUrl: path.join(outPath,'js-tmp'),
          name: 'main',
          out: path.join(outPath,'js','main.js')
        }, function() {
          liveReload()
        });
      })
      //.pipe(liveReload());
  }

  var copyStatic = function() {
     gulp.src(paths.staticPaths, {base:"src/"})
      .pipe(gulp.dest(outPath))
      .pipe(liveReload());
    };

  var copyHtml = function() {
    gulp.src(paths.html, {base:"src/"})
      .pipe(gulp.dest(outPath))
      .pipe(liveReload());
  };

  gulp.watch(paths.less, processLess);
  gulp.watch([paths.coffee, paths.templates], processCoffee);
  gulp.watch(paths.staticPaths, copyStatic);
  gulp.watch(paths.html, copyHtml);
  processLess();
  processCoffee();
  copyStatic();
  copyHtml();

  server({
    env:'dev'
  })

});

gulp.task('clean-dist', function () {
  return gulp.src(__dirname + "/public", {read: false})
    .pipe(clean());
});

gulp.task('run-dist',['dist'], function() {
  connect.server({
    root: __dirname + "/public",
    livereload: false,
    port: 8081
  });
})

gulp.task('dist', ['clean-dist'], function(cb) {
  var outPath = __dirname + "/public";
  var buildTime = Date.now()
  async.series([
    function(cb) {
      // Process LESS
      gulp.src("src/less/main.less")
        .pipe(plumber())
        .pipe(less())
        .pipe(prefix("last 1 version", "> 1%", "ie 8"))
        .pipe(minifyCss())
        .pipe(rename('main_' + buildTime + '.css'))
        .pipe(gulp.dest(path.join(outPath,'css')))
        .on("end", function() {
          cb()
        })
    },
    // Process coffee
    function(cb) {
      gulp.src('src/coffee/main.coffee', { read: false })
        .pipe(browserify({
          transform: ['coffeeify','browserify-handlebars'],
          extensions: ['.coffee'],
          debug:false
        }))
        .pipe(uglify())
        .pipe(rename('main_' + buildTime + '.js'))
        .pipe(gulp.dest(path.join(outPath,'js')))
        .on("end", function() {
          cb()
        })
    },
    // Copy static files
    function(cb) {
      gulp.src(paths.staticPaths, {base:"src/"})
        .pipe(gulp.dest(outPath))
        .on("end", function() {
        cb()
      })
    },
    function(cb) {
      gulp.src(paths.html)
        .pipe(gulp.dest(outPath))
        //.pipe(rename("test.html"))
        //.pipe(gulp.dest(outPath))
        .on("end", function() {
          cb();
        })
    }
  ],cb)

});