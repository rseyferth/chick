var gulp = require('gulp'),
	jshint = require('gulp-jshint')
	uglify = require('gulp-uglify'),
	rename = require('gulp-rename'),
	concat = require('gulp-concat');


gulp.task('js', function() {

	return gulp.src('src/**/*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'))
		
		.pipe(concat('chick.js'))
		.pipe(gulp.dest('dist'));

});







gulp.task('minify', ['js'], function() {
	gulp.src('dist/chick.js')
		.pipe(uglify())
		.pipe(rename('chick.min.js'))
		.pipe(gulp.dest('dist'));
});


// Clean up task
gulp.task('clean', require('del').bind(null, ['dist']));


gulp.task('watch', function() {

	gulp.watch('src/**/*.js', ['default']);

});




gulp.task('default', ['clean', 'js', 'minify'], function() {

});