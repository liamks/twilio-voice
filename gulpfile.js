var gulp = require('gulp');
var jscs = require('gulp-jscs');


gulp.task('default', function(){
  return gulp.src(['libs/**/*.js', 
                   'routers/**/*.js',
                   'tests/**/*.js'])
             .pipe(jscs({
              fix: true
             }))
             .pipe(gulp.dest('src'));
});