
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

add_executable(demo demo.cpp ${SOKOL_SRC}
        stb.c)
target_link_libraries(demo ${SOKOL_LIBS} soloud)