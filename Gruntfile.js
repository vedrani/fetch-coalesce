'use strict';

var TESTS = ['test/spec/**/*.ut.js'];
var LIBS = [
    'lib/**/*.js',
    'index.js'
];
var CODE = LIBS.concat(TESTS);

module.exports = function gruntfile(grunt) {
    var pkg = require('./package.json');
    var npmTasks = Object.keys(pkg.devDependencies).filter(function(name) {
        return (name !== 'grunt-cli') && (/^grunt-/).test(name);
    });

    npmTasks.forEach(function(name) {
        grunt.task.loadNpmTasks(name);
    });
    grunt.task.loadTasks('./tasks');

    grunt.initConfig({
        eslint: {
            code: {
                src: CODE
            },
            tests: {
                src: TESTS
            }
        },
        karma: {
            options: {
                configFile: 'test/karma.conf.js'
            },
            tdd: {
                options: {
                    autoWatch: true
                }
            },
            test: {
                options: {
                    singleRun: true
                }
            }
        },
        babel: {
            options: {
                sourceMaps: false
            },
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: '',
                        src: LIBS,
                        dest: 'dist'
                    }
                ]
            }
        },
        clean: {
            dist: {
                src: ['dist']
            }
        }
    });

    grunt.registerTask('test', [
        'karma:test',
        'eslint'
    ]);

    grunt.registerTask('tdd', ['karma:tdd']);

    grunt.registerTask('build', [
        'clean:dist',
        'babel:dist'
    ]);
};
