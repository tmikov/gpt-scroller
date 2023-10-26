#set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-exceptions")
#set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-rtti")

if (EMSCRIPTEN)
    add_definitions(-DSOKOL_GLES2)
    set(SOKOL_SRC sokol.c)
    set(CMAKE_EXECUTABLE_SUFFIX ".html")
elseif (APPLE)
    #    add_definitions(-DSOKOL_GLCORE33)
    #    set(SOKOL_LIBS "-framework Cocoa -framework QuartzCore -framework OpenGL")
    add_definitions(-DSOKOL_METAL)
    set(SOKOL_LIBS "-framework Cocoa -framework Metal -framework QuartzCore -framework MetalKit")
    set(SOKOL_SRC sokol.m)
else ()
    add_definitions(-DSOKOL_GLCORE33)
    set(SOKOL_SRC sokol.c)
endif ()

include_directories(${CMAKE_SOURCE_DIR}/external/soloud/include)

set(HERMES_BUILD /Users/tmikov/work/hws/sh-debug)
set(HERMES_SRC /Users/tmikov/fbhermes/xplat/static_h)

include_directories(${HERMES_BUILD}/lib/config)
include_directories(${HERMES_SRC}/include)
include_directories(${HERMES_SRC}/Public)
include_directories(${HERMES_SRC}/API)
include_directories(${HERMES_SRC}/API/jsi)

add_executable(demo demo.cpp ${SOKOL_SRC}
        stb.c)
target_link_libraries(demo ${SOKOL_LIBS} soloud)

add_library(scroller scroller.cpp ${SOKOL_SRC} stb.c)

set(SHERMES /Users/tmikov/work/hws/sh-debug/bin/shermes)


add_custom_command(OUTPUT jsdemo
        COMMAND ${SHERMES} $<$<CONFIG:Debug>:-g3> -typed asciiz.js sapp.js demo.js -L${CMAKE_CURRENT_BINARY_DIR} -lscroller -Wc,-framework,Cocoa,-framework,QuartzCore,-framework,Metal,-framework,MetalKit -lc++
        -o ${CMAKE_CURRENT_BINARY_DIR}/jsdemo
        DEPENDS scroller asciiz.js sapp.js demo.js
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
)
add_custom_target(build-jsdemo DEPENDS jsdemo)