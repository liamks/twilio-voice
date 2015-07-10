var gulp = require('gulp');
var jscs = require('gulp-jscs');


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

gulp.task('default', ['jscs'], function(){

  
});