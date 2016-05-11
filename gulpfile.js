var gulp = require('gulp'),
    bsync = require('browser-sync'),
    reload = bsync.reload,
    mainBowerFiles = require('gulp-main-bower-files'),
    exists = require('path-exists').sync;
    
// Create some task
gulp.task('copy-bower-dep', function() {
    return gulp.src('./bower.json')
           .pipe(mainBowerFiles())
           .pipe(gulp.dest('./dist/libs'));
});

gulp.task('build', ['copy-bower-dep'], function() {
    return gulp.src('./src/**')
        .pipe(gulp.dest('./dist/'))
        .pipe(reload({ stream: true }));
});

gulp.task('test', ['build'], function() {
    console.log('default and test');
});

gulp.task('browser-sync', function() {
    return bsync.init({
        server: {
            baseDir: "./dist/"
        }
    });
});


gulp.task ('watch', function(){
    gulp.watch('src/**', ['build']);
});

gulp.task('default', ['build', 'browser-sync', 'watch'], function() {
    console.log('Hello!');
});
