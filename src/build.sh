#!/bin/bash

shermes=/Users/tmikov/work/hws/sh-debug/bin/shermes
$shermes $* -g3 -typed asciiz.js sapp.js demo.js  -L../cmake-build-debug/src/ -lscroller -Wc,-framework,Cocoa,-framework,QuartzCore,-framework,Metal,-framework,MetalKit -lc++
