var gulp = require("gulp");
var concat = require("gulp-concat");

var uglify = require("gulp-uglify");

gulp.task("scripts", function() {
  gulp
    .src(["./libs/idlie.js", "./libs/slider.js", "./quadRuple.js"])
    .pipe(concat("quadRuple.min.js"))
    .pipe(gulp.dest("./"));
});
