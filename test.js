'use strict';
const fs = require('fs'),
    scan = require('./lexer');

scan(fs.readFileSync('./testProgram.js', 'utf8'));