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

foreach(file IN ITEMS ship enemy background)
    add_custom_command(
            OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/img_${file}.c
            COMMAND echo "const unsigned char img_${file}_png[] = {" > ${CMAKE_CURRENT_BINARY_DIR}/img_${file}.c
            COMMAND ${Python_EXECUTABLE} ${CMAKE_SOURCE_DIR}/tools/xxd.py ${CMAKE_SOURCE_DIR}/${file}.png >>
                ${CMAKE_CURRENT_BINARY_DIR}/img_${file}.c
            COMMAND echo "\}\;" >> ${CMAKE_CURRENT_BINARY_DIR}/img_${file}.c
            COMMAND echo "const unsigned img_${file}_png_size = sizeof img_${file}_png\\;" >>
                ${CMAKE_CURRENT_BINARY_DIR}/img_${file}.c

            DEPENDS ${CMAKE_SOURCE_DIR}/${file}.png
            COMMENT "Generating C array from ${file}.png"
    )
endforeach()


add_executable(demo demo.cpp img_ship.c img_enemy.c img_background.c)
target_link_libraries(demo sokol stb cimgui soloud)

set(HERMES_BUILD "" CACHE STRING "Hermes build directory")
set(HERMES_SRC $ENV{HOME}/fbsource/xplat/static_h CACHE STRING "Hermes source directory")
set(SHERMES ${HERMES_BUILD}/bin/shermes CACHE STRING "shermes tool path")

include_directories(${HERMES_BUILD}/lib/config)
include_directories(${HERMES_SRC}/include)
include_directories(${HERMES_SRC}/Public)
include_directories(${HERMES_SRC}/API)
include_directories(${HERMES_SRC}/API/jsi)

add_library(scroller scroller.cpp js_externs_cwrap.c img_ship.c img_enemy.c img_background.c)
target_link_libraries(scroller sokol stb)

if (0)
add_custom_command(OUTPUT jsdemo
        COMMAND ${SHERMES} $<$<CONFIG:Debug>:-g3> -typed ffi_helpers.js asciiz.js sapp.js js_externs.js nbody.js demo.js
        -L${CMAKE_CURRENT_BINARY_DIR}
        -L${CMAKE_CURRENT_BINARY_DIR}/sokol
        -L${CMAKE_CURRENT_BINARY_DIR}/stb
        -lscroller -lsokol -lcimgui -lstb
        -Wc,-I.
        -Wc,-framework,Cocoa,-framework,QuartzCore,-framework,Metal,-framework,MetalKit -lc++
        -o ${CMAKE_CURRENT_BINARY_DIR}/jsdemo
        DEPENDS scroller ffi_helpers.js asciiz.js sapp.js js_externs.js nbody.js demo.js
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
)
add_custom_target(build-jsdemo DEPENDS jsdemo)
endif()

set(JSDEMO_O jsdemo${CMAKE_C_OUTPUT_EXTENSION})
add_custom_command(OUTPUT ${JSDEMO_O}
        COMMAND ${SHERMES} $<$<CONFIG:Debug>:-g3> -typed --exported-unit=demo -c
            ffi_helpers.js asciiz.js sapp.js js_externs.js nbody.js demo.js
        -Wc,-I.
        -o ${CMAKE_CURRENT_BINARY_DIR}/${JSDEMO_O}
        DEPENDS ffi_helpers.js asciiz.js sapp.js js_externs.js nbody.js demo.js
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
)

add_executable(jsdemo ${CMAKE_CURRENT_BINARY_DIR}/${JSDEMO_O})
set_target_properties(jsdemo PROPERTIES LINKER_LANGUAGE CXX)
target_link_directories(jsdemo PRIVATE ${HERMES_BUILD}/lib)
target_link_libraries(jsdemo sokol stb cimgui scroller hermesvm)
