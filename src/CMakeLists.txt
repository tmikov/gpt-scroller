#=== LIBRARY: cimgui + Dear ImGui
add_library(cimgui STATIC
        cimgui/cimgui.cpp
        cimgui/cimgui.h
        cimgui/imgui/imgui.cpp
        cimgui/imgui/imgui.h
        cimgui/imgui/imgui_widgets.cpp
        cimgui/imgui/imgui_draw.cpp
        cimgui/imgui/imgui_tables.cpp
        cimgui/imgui/imgui_demo.cpp)
target_include_directories(cimgui INTERFACE cimgui)

add_subdirectory(sokol)
add_subdirectory(stb)

include_directories(${CMAKE_SOURCE_DIR}/external/soloud/include)

add_executable(demo demo.cpp)
target_link_libraries(demo sokol stb cimgui soloud)

set(SHERMES /Users/tmikov/work/hws/sh-debug/bin/shermes)
set(HERMES_BUILD /Users/tmikov/work/hws/sh-debug)
set(HERMES_SRC /Users/tmikov/fbhermes/xplat/static_h)

include_directories(${HERMES_BUILD}/lib/config)
include_directories(${HERMES_SRC}/include)
include_directories(${HERMES_SRC}/Public)
include_directories(${HERMES_SRC}/API)
include_directories(${HERMES_SRC}/API/jsi)

add_library(scroller scroller.cpp)
target_link_libraries(scroller sokol stb)

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
