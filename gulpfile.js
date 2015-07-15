var gulp = require('gulp');
var jscs = require('gulp-jscs');
var mocha = require('gulp-mocha');



var paths = {
  libs: 'libs/**/*.js',
  routers: 'routers/**/*.js',
  tests: 'test/**/*.js'
};

function jscsfn(){
  return jscs({fix: true, configPath: './.jscsrc'});
};

gulp.task('jscs-libs', function(){
  return gulp.src(paths.libs).pipe(jscsfn()).pipe(gulp.dest('libs'));
});

gulp.task('jscs-routers', function(){
  return gulp.src(paths.routers).pipe(jscsfn()).pipe(gulp.dest('routers'));
});

gulp.task('jscs-tests', function(){
  return gulp.src(paths.tests).pipe(jscsfn()).pipe(gulp.dest('test'));
});

gulp.task('jscs', ['jscs-libs', 'jscs-routers', 'jscs-tests']);

gulp.task('mocha', function(){
  return gulp.src('test/**/*.js', {read: false})
    .pipe(mocha({
      reporter: 'spec'
    }));
});

gulp.task('watch', function(){
  gulp.watch(paths.libs, ['mocha']);
  gulp.watch(paths.routers, ['mocha']);
  gulp.watch(paths.tests, ['mocha']);
});

gulp.task('default', ['watch', 'jscs', 'mocha'], function(){

  
});