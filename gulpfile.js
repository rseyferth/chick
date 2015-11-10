var gulp = require('gulp'),
	jshint = require('gulp-jshint')
	uglify = require('gulp-uglify'),
	rename = require('gulp-rename'),
	concat = require('gulp-concat');

function handleError(err) {
	console.log(err.toString());
	this.emit('end');
}



gulp.task('js', function() {

	return gulp.src([
			'src/Chick.js',
			
     		'src/Core/TriggerClass.js',
	        'src/Core/Promise.js',
	        'src/Core/Model.js',
	        'src/Core/Collection.js',
	        'src/Core/Controller.js',
	        'src/Core/Request.js',
	        'src/Core/Route.js',
	        'src/Core/Router.js',
	        'src/Core/Redirect.js',
	        
	        'src/Net/Api.js',
	        'src/Net/ApiCall.js',
	        'src/Net/ApiResult.js',

	        'src/Gui/I18n.js',
	        'src/Gui/Template.js',
	        'src/Gui/View.js',
	        'src/Gui/ViewContainer.js',
	        'src/Gui/App.js'	        
		])
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

	gulp.watch('src/**/*.js', ['js'])
		.on('error', handleError);

});




gulp.task('default', ['clean', 'js', 'minify'], function() {

});