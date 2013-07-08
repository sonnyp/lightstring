'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      all: [
        '*.js',
        '*.json',
        'src/**/*.js',
      ]
    },
    jsvalidate: {
      files: ['*.js', 'src/**/*.js']
    },
    clean: ['build/'],
    concat: {
      dist: {
        src: ['src/lightstring.js', 'src/Element.js', 'src/JID.js', 'src/Stanza.js', 'src/transports/websocket.js', 'src/mechanisms/PLAIN.js'],
        dest: 'build/lightstring.js'
      }
    },
    uglify: {
      my_target: {
        files: {
          'build/lightstring.min.js': ['build/lightstring.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-jsvalidate');

  grunt.registerTask('build', ['clean', 'concat', 'uglify']);
};
