add_subdirectory(sokol)
add_subdirectory(stb)

include_directories(${CMAKE_SOURCE_DIR}/external/soloud/include)

set(HERMES_BUILD /Users/tmikov/work/hws/sh-debug)
set(HERMES_SRC /Users/tmikov/fbhermes/xplat/static_h)

include_directories(${HERMES_BUILD}/lib/config)
include_directories(${HERMES_SRC}/include)
include_directories(${HERMES_SRC}/Public)
include_directories(${HERMES_SRC}/API)
include_directories(${HERMES_SRC}/API/jsi)

add_executable(demo demo.cpp)
target_link_libraries(demo sokol stb soloud)

add_library(scroller scroller.cpp)
target_link_libraries(scroller sokol stb)

set(SHERMES /Users/tmikov/work/hws/sh-debug/bin/shermes)

add_custom_command(OUTPUT jsdemo
        COMMAND ${SHERMES} $<$<CONFIG:Debug>:-g3> -typed asciiz.js sapp.js demo.js
        -L${CMAKE_CURRENT_BINARY_DIR}
        -L${CMAKE_CURRENT_BINARY_DIR}/sokol
        -L${CMAKE_CURRENT_BINARY_DIR}/stb
        -lscroller -lsokol -lstb
        -Wc,-framework,Cocoa,-framework,QuartzCore,-framework,Metal,-framework,MetalKit -lc++
        -o ${CMAKE_CURRENT_BINARY_DIR}/jsdemo
        DEPENDS scroller asciiz.js sapp.js demo.js
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
)
add_custom_target(build-jsdemo DEPENDS jsdemo)
