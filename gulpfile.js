'use strict';

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');
var gutil = require('gulp-util');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');

gulp.task('default', ['javascript', 'sass']);

gulp.task('javascript', function() {
  return gulp.src('src/backbone.hexer.js')
      // This will output the non-minified version
      .pipe(gulp.dest('./'))
      // Initialise sourcemaps for minified js
      .pipe(sourcemaps.init({loadMaps: true}))
      // This will minify and rename to .min.js
      .pipe(uglify())
      .on('error', gutil.log)
      .pipe(rename({ extname: '.min.js' }))
      // Write the sourcemap
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./'));
});

gulp.task('sass', function () {
    gulp.src('./src/*.scss')
        .pipe(sourcemaps.init())
        .pipe(autoprefixer())
        .pipe(sass())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./'));
});