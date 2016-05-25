'use strict';

import path from 'path';
import gulp from 'gulp';
import del from 'del';
import assets from 'postcss-assets';
import autoprefixer from 'autoprefixer';
import mqpacker from 'css-mqpacker';
import mqkeyframes from 'postcss-mq-keyframes';
import willChange from 'postcss-will-change';
import flexbug from 'postcss-flexbugs-fixes';
import gulpLoadPlugins from 'gulp-load-plugins';
import pkg from './package.json';
import config from './config.json';

const $ = gulpLoadPlugins();
const browserSync = require('browser-sync').create();

const reload = () => new Promise(resolve => {
  browserSync.reload();
  resolve();
});

gulp.task('reload', reload);

function onError(error) {
  console.log(error.toString());
  this.emit('end');
};

// Generate webp images.
const webp = () => gulp.src(config.images.src.towebp)
  .pipe($.webp())
  .pipe(gulp.dest(config.images.dist));

gulp.task('webp', webp);

// Optimize images.
const imagemin = () => gulp.src(config.images.src.all)
  .pipe($.cache($.imagemin({
    progressive: true,
    interlaced: true,
    svgoPlugins: [
      {removeViewBox: false}
    ],
  })))
  .pipe(gulp.dest(config.images.dist))
  .pipe($.size({title: 'images'}));

gulp.task('imagemin', imagemin);

// Generate images.
gulp.task('images', gulp.series('webp', 'imagemin'));

// Copy external icons.
const icons = () => gulp.src(config.icons.src)
  .pipe($.copy(config.icons.dist, {prefix: 4}))
  .pipe($.size({title: 'icons'}));

gulp.task('icons', icons);

// Copy all files
const copy = () => gulp.src([
    `${config.source}/*`,
    `!${config.source}/*.html`,
    `!${config.source}/libraries`,
    `!${config.source}/icons`
  ], {
    dot: true
  }).pipe(gulp.dest(config.destination))
  .pipe($.size({title: 'copy'}));

gulp.task('copy', copy);

// Compile and automatically prefix stylesheets
const styles = () => {
  const processors = [
    assets({
      basePath: './src',
      baseUrl: '../',
      loadPaths: ['images/'],
      cachebuster: true
    }),
    flexbug,
    willChange,
    autoprefixer({cascade: false}),
    mqpacker({sort: true}),
    mqkeyframes
  ];

  return gulp.src(config.styles.src)
    .pipe($.newer('.tmp/css'))
    .pipe($.plumber({
      errorHandler: onError
    }))
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      includePaths: ['./src/libraries/'],
      outputStyle: 'expanded',
      precision: 10
    }))
    .pipe($.postcss(processors))
    .pipe($.webpcss())
    .pipe(gulp.dest('.tmp/css'))
    .pipe($.if('*.css', $.cssnano({
      convertValues: false,
      autoprefixer: false
    })))
    .pipe($.size({title: 'styles'}))
    .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest(config.styles.dist));
};

gulp.task('styles', styles);

// Lint JavaScript.
const lint = () => gulp.src(config.scripts.src)
  .pipe($.eslint())
  .pipe($.eslint.format());

gulp.task('lint', lint);

// Concatenate and minify JavaScript and transpiles ES2015 code to ES5.
const scripts = () => gulp.src(config.scripts.src)
  .pipe($.newer('.tmp/js'))
  .pipe($.plumber({
    errorHandler: onError
  }))
  .pipe($.sourcemaps.init())
  .pipe($.babel())
  .pipe($.sourcemaps.write())
  .pipe($.concat('main.min.js'))
  .pipe(gulp.dest('.tmp/js'))
  .pipe($.uglify({preserveComments: 'some'}))
  .pipe($.size({title: 'scripts'}))
  .pipe($.sourcemaps.write('.'))
  .pipe(gulp.dest(config.scripts.dist));

gulp.task('scripts', scripts);

// Scan your HTML for assets & optimize them
const html = () => gulp.src(config.html.src)
  .pipe($.plumber({
    errorHandler: onError
  }))
  .pipe($.htmlmin({
    removeComments: true,
    collapseWhitespace: true,
    collapseBooleanAttributes: true,
    removeAttributeQuotes: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    removeOptionalTags: true
  }))
  .pipe($.size({title: 'html', showFiles: true}))
  .pipe(gulp.dest(config.destination));

gulp.task('html', html);

// Copy external libraries.
const libraries = () => gulp.src(config.libraries.src)
  .pipe($.copy(config.libraries.dist, {prefix: 4}))
  .pipe($.size({title: 'libraries'}));

gulp.task('libraries', libraries);

// Copy web fonts.
const fonts = () => gulp.src(config.fonts.src)
  .pipe(gulp.dest(config.fonts.dist))
  .pipe($.size({title: 'fonts'}));

gulp.task('fonts', fonts);

// Clean output directory
const clean = () => del(['.tmp', './dist/*', '!./dist/.git'], {dot: true});

gulp.task('clean', clean);

// Watch files for changes & reload
const serveSrc = () => new Promise(resolve => {
  browserSync.init({
    logPrefix: 'BrowserSync',
    scrollElementMapping: ['main'],
    server: ['.tmp', config.source],
    port: 7007
  });

  resolve();
});

gulp.task('serve:src', serveSrc);

// Build and serve the output from the dist build
const serveDist = () => new Promise(resolve => {
  browserSync.init({
    notify: false,
    logPrefix: 'BrowserSync',
    scrollElementMapping: ['main'],
    server: config.destination,
    port: 7007
  });

  resolve();
});

gulp.task('serve:dist', serveDist);

// Watch files change.
const watch = () => {
  gulp.watch([config.html.src], gulp.series('html', 'reload'));
  gulp.watch([config.images.src.all], gulp.series('images', 'reload'));
  gulp.watch([config.styles.src], gulp.series('styles', 'reload'));
  gulp.watch([config.scripts.src], gulp.series(gulp.parallel('lint', 'scripts'), 'reload'));
};

gulp.task('watch', watch);

gulp.task('serve', gulp.series(
  gulp.parallel('scripts', 'styles'),
  'serve:src',
  'watch'
));

// Build production files
gulp.task('build', gulp.series(
    'clean',
    gulp.parallel('libraries', 'fonts', 'html', 'styles', 'lint', 'scripts', 'icons', 'images', 'copy')
  )
);

// Default task.
gulp.task('default', gulp.series('build', 'serve:dist', 'watch'));
