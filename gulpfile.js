var gulp = require('gulp');
var jscs = require('gulp-jscs');
var mocha = require('gulp-mocha');


function jscsfn(){
  return jscs({fix: true, configPath: './.jscsrc'});
};

gulp.task('jscs-libs', function(){
  return gulp.src('libs/**/*.js').pipe(jscsfn()).pipe(gulp.dest('libs'));
});

gulp.task('jscs-routers', function(){
  return gulp.src('routers/**/*.js').pipe(jscsfn()).pipe(gulp.dest('routers'));
});

gulp.task('jscs-tests', function(){
  return gulp.src('tests/**/*.js').pipe(jscsfn()).pipe(gulp.dest('test'));
});

gulp.task('jscs', ['jscs-libs', 'jscs-routers', 'jscs-tests']);

gulp.task('mocha', function(){
  return gulp.src('test/**/*.js', {read: false})
    .pipe(mocha({
      reporter: 'nyan'
    }));
});

gulp.task('default', ['jscs', 'mocha'], function(){

  
});