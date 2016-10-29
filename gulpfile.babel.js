'use strict';

import path from 'path';
import gulp from 'gulp';
import del from 'del';
import swPrecache from 'sw-precache';
import assets from 'postcss-assets';
import autoprefixer from 'autoprefixer';
import mqpacker from 'css-mqpacker';
import mqkeyframes from 'postcss-mq-keyframes';
import gulpLoadPlugins from 'gulp-load-plugins';
import bs from 'browser-sync';
import pkg from './package.json';
import config from './config.json';

const $ = gulpLoadPlugins();
const browserSync = bs.create()

const reload = () => new Promise(resolve => {
  browserSync.reload();
  resolve();
});

gulp.task('reload', reload);
 // Simple error handler.
function onError(error) {
  console.log(error.toString());
  this.emit('end');
};

// Generate webp images.
const webp = () => gulp.src(config.images.src.towebp)
  .pipe($.cache($.webp()))
  .pipe(gulp.dest(config.images.dist));

gulp.task('webp', webp);

// Optimize images.
const imagemin = () => gulp.src(config.images.src.all)
  .pipe($.cache($.imagemin({
    progressive: true,
    interlaced: true
  })))
  .pipe(gulp.dest(config.images.dist))
  .pipe($.size({title: 'images'}));

gulp.task('imagemin', imagemin);

// Creates svg sprite.
const svg = () => gulp.src(config.images.src.svg)
  .pipe($.plumber({
    errorHandler: onError
  }))
  .pipe($.svgSprite({
    mode: {
      defs: {
        dest: './',
        sprite: 'sprites/sprite.svg',
        inline: true,
        example: {
          template: './src/images/sprites/template.html',
          dest: 'sprites/sprite.defs.html'
        }
      }
    }
  }))
  .pipe(gulp.dest('./src/images/'))
  .pipe($.size({title: 'svg'}));

gulp.task('svg', svg);

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
    autoprefixer,
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
    .pipe(gulp.dest(config.styles.dist))
    .pipe($.if(browserSync.active, browserSync.stream({ match: '**/*.css' })));
};

gulp.task('styles', styles);

// Lint JavaScript.
const lint = () => gulp.src(config.scripts.src)
  .pipe($.eslint())
  .pipe($.eslint.format())
  .pipe($.if(!browserSync.active, $.eslint.failOnError()));

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
  .pipe(gulp.dest('.tmp/js'))
  .pipe($.concat('main.min.js'))
  .pipe($.uglify({preserveComments: 'some'}))
  .pipe($.size({title: 'scripts'}))
  .pipe($.sourcemaps.write('.'))
  .pipe(gulp.dest(config.scripts.dist));

gulp.task('scripts', scripts);

// HTML process.
const index = () => gulp.src(config.html.index)
  .pipe($.plumber({
    errorHandler: onError
  }))
  .pipe($.injectFile())
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

gulp.task('index', index)

// Injects inline svg sprite.
gulp.task('inject', gulp.series('svg', 'index'));

// Copy external libraries.
const libraries = () => gulp.src(config.libraries.src)
  .pipe($.copy(config.libraries.dist, {prefix: 5}))
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
    notify: false,
    logPrefix: 'BrowserSync',
    scrollElementMapping: ['main'],
    server: ['.tmp', config.source, config.destination],
    port: 8087
  });

  resolve();
});

gulp.task('serve:src', serveSrc);

// Build and serve the output from the dist build
const serveDist = () => new Promise(resolve => {
  browserSync.init({
    logPrefix: 'BrowserSync',
    scrollElementMapping: ['main'],
    server: config.destination,
    port: 8087
  });

  resolve();
});

gulp.task('serve:dist', serveDist);

const copySW = () => gulp.src([
    'node_modules/sw-toolbox/sw-toolbox.js',
    'src/js/sw/runtime-caching.js'
  ])
  .pipe(gulp.dest(config.scripts.sw));

// Copy over the scripts that are used in importScripts as part of the generate-sw task.
gulp.task('copy-sw', copySW);

const generateSW = () => {
  const rootDir = config.destination;
  const filepath = path.join(rootDir, 'service-worker.js');

  return swPrecache.write(filepath, {
    // Used to avoid cache conflicts when serving on localhost.
    cacheId: pkg.name || 'starter-kit',
    // sw-toolbox.js needs to be listed first. It sets up methods used in runtime-caching.js.
    importScripts: [
      'js/sw/sw-toolbox.js',
      'js/sw/runtime-caching.js'
    ],
    staticFileGlobs: [
      // Add/remove glob patterns to match your directory setup.
      `${rootDir}/images/**/*`,
      `${rootDir}/js/**/*.js`,
      `${rootDir}/css/**/*.css`,
      `${rootDir}/*.{html,json}`
    ],
    stripPrefix: `${rootDir}/`
  });
};

// Generates Service Worker for caching.
gulp.task('generate-sw', generateSW);

gulp.task('sw', gulp.series('copy-sw', 'generate-sw'));

// Watch files change.
const watch = () => {
  gulp.watch([config.html.index, config.images.src.svg], gulp.series('inject', 'reload'));
  gulp.watch([config.images.src.all], gulp.series('images', 'reload'));
  gulp.watch([config.styles.src], gulp.series('styles'));
  gulp.watch([config.scripts.src], gulp.series(gulp.parallel('lint', 'scripts'), 'reload'));
};

gulp.task('watch', watch);

gulp.task('serve', gulp.series(
  'serve:src',
  'watch'
));

// Build production files
gulp.task('build', gulp.series(
    'clean',
    gulp.parallel('libraries', 'fonts', 'inject', 'styles', 'lint', 'scripts', 'sw', 'icons', 'images', 'copy')
  )
);

// Development server.
gulp.task('dev', gulp.series('build', 'serve'))

// Default task.
gulp.task('default', gulp.series('build', 'serve:dist', 'watch'));
