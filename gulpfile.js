const gulp         = require('gulp');

// templates
const pug          = require('gulp-pug');

// styles 
const sass         = require('gulp-sass');
const rename       = require('gulp-rename');
const sourcemaps   = require('gulp-sourcemaps');
const autoprefixer = require('gulp-autoprefixer');
const minifycss    = require('gulp-csso');

// sprites
const svgmin       = require('gulp-svgmin');
const cheerio      = require('gulp-cheerio');
const svgSprite    = require('gulp-svg-sprite');
const replace      = require('gulp-replace');

// images
const imagemin     = require('gulp-imagemin');
const cache        = require('gulp-cache');

// scripts
const uglify       = require('gulp-uglify');

// general
const gulpIf       = require('gulp-if');
const plumber      = require('gulp-plumber');
const notify       = require('gulp-notify');
const concat       = require('gulp-concat');
const wait         = require('gulp-wait');
const del          = require('del');
const browserSync  = require('browser-sync').create();

// adaptive
const cssunit = require('gulp-css-unit');

/*--------------------------paths--------------------------*/
const paths = {
	root: './dist',
	styles: {
		entry: 'app/styles/app.scss',   
		src: 'app/styles/**/*.scss',
		dest: 'dist/assets/styles/'
	},
	scripts: {
		src: 'app/scripts/**/*.js',
		dest: 'dist/assets/scripts/'
	},
	templates: {
		pages: 'app/templates/pages/*.pug',
		src: 'app/templates/**/*.pug',
		dest: 'dist/assets/'
   },
	images: {
		src: 'app/images/**/*.{jpg,png,svg}', // add other file types if needed
		dest: 'dist/assets/images/'
   },
	sprites: {
		src: 'app/sprites/**/*.svg',
		dest: 'dist/assets/sprites/'
   },
	fonts: {
		src: 'app/fonts/**/*.*',
		dest: 'dist/assets/fonts/'
   },
	docs: {
		src: 'app/docs/**/*.*',
		dest: 'dist/assets/docs/'
   }
};

/* ------ Конфигурация и настройка сборки  -------- */
// const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';
const isDevelopment = true;


/*------------paths to JS files------------*/
let moduleJs = [
	'app/scripts/common/test1.js',
	'app/scripts/common/test2.js'
];

/*****************************------------JS and CSS libraries------------*****************************/

/*------------paths to plugins and JS libraries------------*/

let vendorJs = [
	'node_modules/jquery/dist/jquery.min.js' // если подключаем jQuery плагины, то их ставить в массив ПОСЛЕ самого jQuery
];

/*------------pathes to plugins and style libraries------------*/
let vendorCss = [
	'node_modules/normalize-css/normalize.css'
];

/*-------combining plugins and JS libraries in one file--------*/
function vendorJS() {
	return gulp
	.src(vendorJs)
	.pipe(concat('vendor.min.js'))
	.pipe(gulp.dest(paths.scripts.dest));
};

/*-------combining plugins and style libraries--------*/
function vendorCSS(){
	return gulp
		.src(vendorCss)
		.pipe(concat('vendor.min.css'))
		.pipe(minifycss())
		.pipe(gulp.dest(paths.styles.dest))
}

/*****************************-----------------------------------------------*****************************/


//js
function scripts(){
	return gulp.src(moduleJs)
		.pipe(plumber({
			errorHandler: notify.onError(function (err){
				return {title: 'javaScript', message: err.message}
			})
		}))
		.pipe(gulpIf(isDevelopment, sourcemaps.init()))
		.pipe(concat('main.min.js'))
		.pipe(uglify())
		.pipe(gulpIf(isDevelopment, sourcemaps.write())) //write sourcemaps in dev mode
		.pipe(gulp.dest(paths.scripts.dest))
		.pipe(browserSync.stream());
};


/*--------------------------pug--------------------------*/
function templates() {               
	return gulp.src(paths.templates.pages)
		.pipe(plumber({
			errorHandler: notify.onError(function (error) {
				return {
					title: 'Pug', 
					message: error.message
				}
			})
		}))
		.pipe(pug({ pretty: true }))
		.pipe(gulp.dest(paths.root))
		.pipe(wait(500)) //на всякий случай. У меня без этого работает ОК, но Юры на созвоне иногда страница перезагружалась, не успев отрисоваться
		.pipe(browserSync.stream({ once: true }))
}

/*--------------------------styles--------------------------*/
function styles() {
	console.log(isDevelopment);
	return gulp.src(paths.styles.entry)
		.pipe(wait(500))
		.pipe(plumber({
			errorHandler: notify.onError(function (error) {
				return {
					title: 'Style', 
					message: error.message
				}
			})
		}))
		.pipe(gulpIf(isDevelopment, sourcemaps.init()))
		.pipe(sass())
		.pipe(cssunit({
			type     :    'px-to-rem',
			rootSize :    16
	  	}))
		.pipe(autoprefixer('last 4 versions'))        
		.pipe(rename({suffix: '.min'}))
		.pipe(minifycss())
		.pipe(gulpIf(isDevelopment, sourcemaps.write()))
		.pipe(gulp.dest(paths.styles.dest))
		.pipe(browserSync.stream());      
}

/*------------------------build folder cleaning------------------------*/
function clean() {
	return del(paths.root);
}

/*------------------------images transfer and optimisation------------------------*/
function images() {
	return gulp.src(paths.images.src)
		.pipe(cache(imagemin({optimisationLevel: 3, progressive: true, interlaced: true})))
		.pipe(gulp.dest(paths.images.dest));
}

/*------------------------svg sprites------------------------*/
function toSvg() {
	return gulp.src(paths.sprites.src)
		.pipe(svgmin({
			js2svg: {
					pretty: true
			}
		}))
		.pipe(cheerio({
			run: function($) {
				$('[fill]').removeAttr('fill');
				$('[stroke]').removeAttr('stroke');
				$('[style]').removeAttr('style');
			},
			parserOptions: {
					xmlMode: true
			}
		})
	)
	.pipe(replace('&gt;', '>'))
	.pipe(svgSprite({
		mode: {
			symbol: {
				sprite: "../sprite.svg",
				example: {
					dest: '../tmp/spriteSvgDemo.html'
				}
			}
		}
	}))
	.pipe(gulp.dest(paths.sprites.dest))
}

/*------------------------fonts transfer------------------------*/
function fonts() {
	return gulp.src(paths.fonts.src)
		.pipe(gulp.dest(paths.fonts.dest));
}

/*------------------------docs transfer------------------------*/
function docs() {
	return gulp.src(paths.docs.src)
		.pipe(gulp.dest(paths.docs.dest));
}

/*------------------------watcher------------------------*/
function watch() {
	gulp.watch(paths.scripts.src, scripts);
	gulp.watch(vendorCss, vendorCSS);
	gulp.watch(vendorJs, vendorJS);
	gulp.watch(paths.styles.src, styles);
	gulp.watch(paths.templates.src, templates);
	gulp.watch(paths.sprites.src, toSvg);
	gulp.watch(paths.images.src, images);
	gulp.watch(paths.fonts.src, fonts);
	gulp.watch(paths.docs.src, docs);
}

/*------------------------server------------------------*/
function server() {
	browserSync.init({
		server: paths.root,
		open: false
	});
	browserSync.watch(
		[paths.root + '**/*.*'], {ignored: ['**/*.css', '**/*.html']},
		browserSync.reload
	);
}

/*-------function exports to start them from the console-------*/
exports.clean = clean; 
exports.styles = styles;
exports.scripts = scripts;
exports.templates = templates;
exports.images = images;
exports.fonts = fonts;
exports.watch = watch;
exports.server = server;
exports.vendorCSS = vendorCSS;
exports.vendorJS = vendorJS;
exports.toSvg = toSvg;
exports.docs = docs;



/*------------------------build and watch------------------------*/
// gulp.task('default', gulp.series(
//     clean,
//     gulp.parallel(styles, vendorCSS, scripts, vendorJS, templates, images, fonts, docs, toSvg),
//     gulp.parallel(watch, server)
// ));


gulp.task('default', gulp.series(
	gulp.parallel(styles, vendorCSS, scripts, vendorJS, templates, images, fonts, docs, toSvg),
	gulp.parallel(watch, server)
));

gulp.task('build', gulp.series(
	clean,
	gulp.parallel(styles, vendorCSS, scripts, vendorJS, templates, images, fonts, docs, toSvg)
));