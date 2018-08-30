module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        sass: {
            dist: {
                files: [{
                    expand: true,
                    cwd: 'src/scss',
                    src: ['*.scss', '**/*.scss'],
                    dest: 'src/styles',
                    ext: '.css'
                }]
            }
        },
        watch: {
            files: ['src/scss/*.scss', 'src/scss/**/*.scss'],
            tasks: ['sass'],
        }
    })

    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.registerTask('default', ['watch']);
}