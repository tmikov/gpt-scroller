# Static Hermes Application Architecture

This document explains the architecture and build system of this Static Hermes application, designed for LLM reference when updating or creating similar applications.

## Overview

This is a game/demo application that combines:
- **Static Hermes** - JavaScript/TypeScript compiler and runtime from Meta
- **Sokol** - Cross-platform graphics/windowing library
- **Dear ImGui** - Immediate mode GUI library
- **FFI (Foreign Function Interface)** - Zero-overhead C/JS interop

The application compiles TypeScript/JavaScript to native code and provides direct FFI bindings to C libraries, achieving native performance with JavaScript/TypeScript as the primary development language.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Entry                        │
│                      (sokol_main)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  scroller.cpp (C++ Bridge)                   │
│  • Initializes Static Hermes Runtime                         │
│  • Sets up Sokol (graphics/windowing)                        │
│  • Sets up Dear ImGui                                        │
│  • Provides native APIs (image loading, etc.)                │
│  • Calls JS entry points: on_init, on_frame, on_event       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              JavaScript Application (demo.js)                │
│  • Game logic, UI rendering                                  │
│  • Directly calls C functions via FFI                        │
│  • Uses js_externs.js for Dear ImGui/Sokol bindings         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 Generated FFI Bindings                       │
│                   (js_externs.js)                            │
│  • 12,296 lines of auto-generated FFI declarations          │
│  • Direct C function bindings using $SHBuiltin.extern_c()   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Native Libraries                          │
│  • sokol - Graphics, windowing, input                        │
│  • cimgui - Dear ImGui C bindings                           │
│  • stb - Image loading                                       │
│  • hermesvm - Static Hermes runtime                         │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
.
├── src/
│   ├── demo.js                 # Main JS application code
│   ├── scroller.cpp            # C++ bridge between Sokol and Hermes
│   ├── js_externs.js           # Generated FFI bindings (12k lines)
│   ├── js_externs.c            # C headers to parse for FFI generation
│   ├── js_externs_cwrap.c      # Generated C wrapper functions
│   ├── gen_js_externs.sh       # Script to generate FFI bindings
│   ├── ffi_helpers.js          # FFI utility functions
│   ├── asciiz.js               # String handling utilities
│   ├── sapp.js                 # Sokol app constants/helpers
│   ├── nbody.js                # N-body simulation demo
│   ├── sokol/                  # Sokol library wrappers
│   ├── stb/                    # STB image library wrappers
│   └── cimgui/                 # Dear ImGui C bindings
├── tools/
│   ├── ffigen.py               # FFI binding generator
│   └── xxd.py                  # Binary to C array converter
├── external/
│   └── soloud/                 # Audio library (external dependency)
├── CMakeLists.txt              # Root CMake config
└── src/CMakeLists.txt          # Main build configuration
```

## Build System (CMake)

### Key CMake Variables

Defined in `src/CMakeLists.txt:37-39`:

```cmake
HERMES_BUILD   # Path to Hermes build directory
HERMES_SRC     # Path to Hermes source (default: $HOME/fbsource/xplat/static_h)
SHERMES        # Path to shermes compiler tool
```

### Build Process Overview

The build happens in several stages:

#### 1. Image Asset Generation

**Location:** `src/CMakeLists.txt:18-31`

Converts PNG images to C arrays for embedding:

```cmake
foreach(file IN ITEMS ship enemy background)
    add_custom_command(
        OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/img_${file}.c
        COMMAND echo "const unsigned char img_${file}_png[] = {" > ...
        COMMAND ${Python_EXECUTABLE} ${CMAKE_SOURCE_DIR}/tools/xxd.py ${CMAKE_SOURCE_DIR}/${file}.png >> ...
        COMMAND echo "\}\;" >> ...
        DEPENDS ${CMAKE_SOURCE_DIR}/${file}.png
    )
endforeach()
```

**Result:** Creates `img_ship.c`, `img_enemy.c`, `img_background.c` with embedded PNG data.

#### 2. Native Library: scroller

**Location:** `src/CMakeLists.txt:47-48`

```cmake
add_library(scroller scroller.cpp js_externs_cwrap.c img_ship.c img_enemy.c img_background.c)
target_link_libraries(scroller sokol stb)
```

The `scroller` library provides the C++ bridge between Sokol and JavaScript.

#### 3. JavaScript Compilation (jsdemo target)

**Location:** `src/CMakeLists.txt:66-79`

**Stage 1: Compile TypeScript/JavaScript to Object File**

```cmake
add_custom_command(OUTPUT ${JSDEMO_O}
    COMMAND ${SHERMES} $<$<CONFIG:Debug>:-g3> -typed --exported-unit=demo -c
        ffi_helpers.js asciiz.js sapp.js js_externs.js nbody.js demo.js
    -Wc,-I.
    -o ${CMAKE_CURRENT_BINARY_DIR}/${JSDEMO_O}
    DEPENDS ffi_helpers.js asciiz.js sapp.js js_externs.js nbody.js demo.js
)
```

**Shermes flags:**
- `-typed` - Enable Static Hermes typed mode
- `--exported-unit=demo` - Export the demo unit
- `-c` - Compile to object file (don't link)
- `-Wc,-I.` - Pass `-I.` to the C compiler
- `-g3` - Debug symbols (in Debug builds)

**Stage 2: Link into Executable**

```cmake
add_executable(jsdemo ${CMAKE_CURRENT_BINARY_DIR}/${JSDEMO_O})
set_target_properties(jsdemo PROPERTIES LINKER_LANGUAGE CXX)
target_link_directories(jsdemo PRIVATE ${HERMES_BUILD}/lib)
target_link_libraries(jsdemo sokol stb cimgui scroller hermesvm)
```

**Linked libraries:**
- `sokol` - Graphics/windowing
- `stb` - Image loading
- `cimgui` - Dear ImGui bindings
- `scroller` - Custom C++ bridge
- `hermesvm` - Hermes JavaScript VM

## FFI (Foreign Function Interface) System

### Overview

The FFI system generates JavaScript bindings for C libraries automatically using CastXML and a Python code generator.

### FFI Generation Process

**Script:** `src/gen_js_externs.sh`

```bash
#!/bin/bash

../tools/ffigen.py js js_externs.c sokol_imgui.h,cimgui.h > js_externs.js
../tools/ffigen.py cwrap js_externs.c sokol_imgui.h,cimgui.h > tmp-cwrap.c

cat << "EOF" - tmp-cwrap.c > js_externs_cwrap.c
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui/cimgui.h"
#include "sokol_app.h"
#include "sokol_gfx.h"
#include "sokol_imgui.h"
EOF

rm tmp-cwrap.c
```

**Steps:**

1. **Generate JavaScript FFI bindings** (`js_externs.js`)
   - Input: `js_externs.c` (minimal C file with includes)
   - Filter: Only export from `sokol_imgui.h,cimgui.h`
   - Output: 12,296 lines of FFI declarations

2. **Generate C wrapper functions** (`js_externs_cwrap.c`)
   - Some types (structs/unions) need special handling
   - Creates wrapper functions that pass structs by pointer

### FFI Generator Tool: ffigen.py

**Location:** `tools/ffigen.py`

**How it works:**

1. **Parse C headers** using CastXML
   - Extracts all type definitions (structs, enums, functions)
   - Parses #define constants

2. **Type mapping** (C to Static Hermes):
   ```python
   simple_type_mapping = {
       "char": "c_char",
       "int": "c_int",
       "unsigned int": "c_uint",
       "float": "c_float",
       "double": "c_double",
       "bool": "c_bool",
       "void": "void",
       # All pointers, structs, unions → c_ptr
   }
   ```

3. **Generate FFI declarations**:
   ```javascript
   const _igBegin = $SHBuiltin.extern_c({}, function igBegin(
       _name: c_ptr,
       _p_open: c_ptr,
       _flags: c_int
   ): c_bool { throw 0; });
   ```

4. **Generate C wrappers** (for structs passed by value):
   - Detects when structs are passed by value
   - Creates wrapper that accepts pointer instead
   - Automatically dereferences in wrapper

### FFI Usage in JavaScript

**Direct calls - zero overhead:**

```javascript
// Call Dear ImGui functions directly
if (_igBegin(tmpAsciiz("Game"), c_null, 0)) {
    _igGetCursorScreenPos(tmpVec);
    _igGetContentRegionAvail(tmpVec);
    // ... render content ...
}
_igEnd();

// Draw primitives
_ImDrawList_AddRectFilled(
    _igGetWindowDrawList(),
    s_vecs,
    _sh_ptr_add(s_vecs, _sizeof_ImVec2),
    IM_COL32(255, 255, 255, 255),
    0.0,
    0
);
```

**No wrapper layer** - JavaScript calls compile to direct native function calls.

## C++ Bridge: scroller.cpp

### Purpose

Bridges the Sokol application framework with the Static Hermes JavaScript runtime.

### Key Components

#### 1. Entry Point (line 247-253)

```cpp
sapp_desc sokol_main(int argc, char* argv[]) {
    SHRuntime *shr = _sh_init(argc, argv);
    if (!_sh_initialize_units(shr, 1, &sh_export_demo))
        abort();
    return s_app_desc;
}
```

- Initializes Static Hermes runtime
- Loads compiled JavaScript unit (`sh_export_demo`)
- Returns Sokol app descriptor

#### 2. JavaScript API Called from C++

The C++ bridge calls these JavaScript functions:

**`on_init()`** - Called once during app initialization
```cpp
s_hermes->global()
    .getPropertyAsFunction(*s_hermes, "on_init")
    .call(*s_hermes);
```

**`on_frame(width, height, time)`** - Called every frame (60 FPS)
```cpp
s_hermes->global()
    .getPropertyAsFunction(*s_hermes, "on_frame")
    .call(*s_hermes, sapp_widthf(), sapp_heightf(), elapsed_time);
```

**`on_event(type, key_code, modifiers)`** - Called for input events
```cpp
s_hermes->global()
    .getPropertyAsFunction(*s_hermes, "on_event")
    .call(*s_hermes, (double)ev->type, (double)ev->key_code, (double)ev->modifiers);
```

#### 3. C APIs Exported to JavaScript

**Image Loading API** (lines 94-118):
```cpp
extern "C" int load_image(const char *path);
extern "C" int image_width(int index);
extern "C" int image_height(int index);
extern "C" const simgui_image_t *image_simgui_image(int index);
```

**Background Color API** (lines 174-177):
```cpp
extern "C" float *get_bg_color();  // Returns pointer to RGBA array
```

These functions are declared in JavaScript using `$SHBuiltin.extern_c()` and can be called directly.

#### 4. Application Lifecycle

```cpp
static void app_init() {
    // Initialize Sokol graphics
    sg_setup(&desc);
    // Initialize Dear ImGui
    simgui_setup(simgui_desc_t{});
    // Call JS initialization
    s_hermes->global().getPropertyAsFunction(*s_hermes, "on_init").call(*s_hermes);
}

static void app_frame() {
    // Begin ImGui frame
    simgui_new_frame({...});
    // Clear framebuffer
    sg_begin_default_pass(&pass_action, width, height);
    // Call JS render function
    s_hermes->global().getPropertyAsFunction(*s_hermes, "on_frame").call(*s_hermes, ...);
    // Render ImGui and debug text
    simgui_render();
    sdtx_draw();
    // Commit frame
    sg_end_pass();
    sg_commit();
}

static void app_event(const sapp_event *ev) {
    // Handle Cmd+Q quit
    if (ev->type == SAPP_EVENTTYPE_KEY_DOWN && ev->key_code == SAPP_KEYCODE_Q) {
        sapp_request_quit();
    }
    // Forward to JavaScript
    s_hermes->global().getPropertyAsFunction(*s_hermes, "on_event").call(*s_hermes, ...);
    // Let ImGui process events
    simgui_handle_event(ev);
}

static void app_cleanup() {
    s_images.clear();
    simgui_shutdown();
    sg_shutdown();
    _sh_done(s_shRuntime);
}
```

#### 5. Embedded Image Assets (lines 26-35)

```cpp
#define IMPORT_IMAGE(name)                           \
  extern "C" const unsigned char img_##name##_png[]; \
  extern "C" const unsigned img_##name##_png_size;   \
  static InternalImage s_img_##name = {img_##name##_png, img_##name##_png_size, #name}

IMPORT_IMAGE(ship);
IMPORT_IMAGE(enemy);
IMPORT_IMAGE(background);
```

These reference the C arrays generated from PNG files during the build.

## JavaScript Application Structure

### Entry Points (defined in demo.js)

**`globalThis.on_init`** - Initialize game state
```javascript
globalThis.on_init = function on_init(): void {
    shipImage = new Image("ship");
    enemyImage = new Image("enemy");
    backgroundImage = new Image("background");
    ship = new Ship(ASSUMED_W / 2, ASSUMED_H / 2);
}
```

**`globalThis.on_frame`** - Render frame
```javascript
globalThis.on_frame = function on_frame(width: number, height: number, curTime: number): void {
    flushAllocTmp();
    gameWindow(width, height, curTime);
    renderSpreadsheet("Cities", width, height, curTime);
    chooseColorWindow();
    bouncingBallWindow(width, height);
    nbodyWindow(width, height);
}
```

**`globalThis.on_event`** - Handle input
```javascript
globalThis.on_event = function on_event(type: number, key_code: number, modifiers: number): void {
    if (type === _SAPP_EVENTTYPE_KEY_DOWN) {
        keys[key_code] = 1;
        if (key_code === _SAPP_KEYCODE_SPACE) {
            bullets.push(new Bullet(ship.x + ship.width, ship.y + ship.height / 2));
        }
    } else if (type === _SAPP_EVENTTYPE_KEY_UP) {
        keys[key_code] = 0;
    }
}
```

### Supporting JavaScript Files

**`ffi_helpers.js`** - FFI utility functions
- Memory allocation helpers
- Pointer arithmetic
- Type conversions

**`asciiz.js`** - String handling
- Convert JavaScript strings to C null-terminated strings
- Temporary string allocation

**`sapp.js`** - Sokol app constants
- Event type constants
- Key code constants
- Window flags

**`nbody.js`** - N-body physics simulation
- Demonstrates compute-intensive JavaScript code

### Image Loading Pattern

```javascript
// FFI declarations for C functions
const _load_image = $SHBuiltin.extern_c({}, function load_image(path: c_ptr): c_int { return 0; });
const _image_width = $SHBuiltin.extern_c({}, function image_width(image: c_int): c_int { return 0; });
const _image_height = $SHBuiltin.extern_c({}, function image_height(image: c_int): c_int { return 0; });
const _image_simgui_image = $SHBuiltin.extern_c({}, function image_simgui_image(image: c_int): c_ptr { throw 0; });

// JavaScript wrapper class
class Image {
    handle: number;
    width: number;
    height: number;
    simguiImage: c_ptr;

    constructor(path: string) {
        let path_z = stringToAsciiz(path);
        try {
            this.handle = _load_image(path_z);
        } finally {
            _free(path_z);
        }
        this.width = _image_width(this.handle);
        this.height = _image_height(this.handle);
        this.simguiImage = _image_simgui_image(this.handle);
    }
}
```

### Dear ImGui Usage Pattern

```javascript
// Allocate temp buffer for ImVec2 structs
const vec2Buffer = allocTmp(_sizeof_ImVec2);

// Set window position
set_ImVec2_x(vec2Buffer, 10);
set_ImVec2_y(vec2Buffer, 10);
_igSetNextWindowPos(vec2Buffer, _ImGuiCond_Once, allocTmp(_sizeof_ImVec2));

// Set window size
set_ImVec2_x(vec2Buffer, 400);
set_ImVec2_y(vec2Buffer, 200);
_igSetNextWindowSize(vec2Buffer, _ImGuiCond_Once);

// Create window
_igBegin(tmpAsciiz("Settings"), c_null, _ImGuiWindowFlags_None);

// Add widgets
_igColorEdit3(tmpAsciiz("Bg"), _get_bg_color(), _ImGuiColorEditFlags_None);
_igText(tmpAsciiz("Hello World"));

// End window
_igEnd();
```

## Creating a New Application

### Step 1: Set up CMake Variables

Set these environment variables or CMake cache variables:

```bash
export HERMES_BUILD=/path/to/hermes/build
export HERMES_SRC=/path/to/hermes/source
```

Or pass to CMake:
```bash
cmake -DHERMES_BUILD=/path/to/build -DHERMES_SRC=/path/to/source ..
```

### Step 2: Create JavaScript Application

Create `src/myapp.js`:

```javascript
// Define entry points
globalThis.on_init = function on_init(): void {
    // Initialize application state
};

globalThis.on_frame = function on_frame(width: number, height: number, time: number): void {
    // Render frame
    if (_igBegin(tmpAsciiz("My Window"), c_null, 0)) {
        _igText(tmpAsciiz("Hello from JavaScript!"));
    }
    _igEnd();
};

globalThis.on_event = function on_event(type: number, key_code: number, modifiers: number): void {
    // Handle input events
};

// Start the application
_scroller_run($SHBuiltin.c_native_runtime(), 1024, 768);
```

### Step 3: Update CMakeLists.txt

Modify `src/CMakeLists.txt` to compile your app:

```cmake
# Change the JavaScript source files
set(MYAPP_O myapp${CMAKE_C_OUTPUT_EXTENSION})
add_custom_command(OUTPUT ${MYAPP_O}
    COMMAND ${SHERMES} $<$<CONFIG:Debug>:-g3> -typed --exported-unit=myapp -c
        ffi_helpers.js asciiz.js sapp.js js_externs.js myapp.js
    -Wc,-I.
    -o ${CMAKE_CURRENT_BINARY_DIR}/${MYAPP_O}
    DEPENDS ffi_helpers.js asciiz.js sapp.js js_externs.js myapp.js
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
)

# Change the executable name
add_executable(myapp ${CMAKE_CURRENT_BINARY_DIR}/${MYAPP_O})
set_target_properties(myapp PROPERTIES LINKER_LANGUAGE CXX)
target_link_directories(myapp PRIVATE ${HERMES_BUILD}/lib)
target_link_libraries(myapp sokol stb cimgui scroller hermesvm)
```

### Step 4: Update scroller.cpp

Change the exported unit name (line 245):

```cpp
extern "C" SHUnit sh_export_myapp;  // Change from sh_export_demo

sapp_desc sokol_main(int argc, char* argv[]) {
    SHRuntime *shr = _sh_init(argc, argv);
    if (!_sh_initialize_units(shr, 1, &sh_export_myapp))  // Change here too
        abort();
    return s_app_desc;
}
```

### Step 5: Build and Run

```bash
mkdir build
cd build
cmake ..
make
./src/myapp
```

## Adding New C APIs

### Step 1: Add C Function to scroller.cpp

```cpp
extern "C" int my_custom_function(int x, float y) {
    return x + (int)y;
}
```

### Step 2: Declare in JavaScript

```javascript
const _my_custom_function = $SHBuiltin.extern_c({}, function my_custom_function(x: c_int, y: c_float): c_int {
    return 0;
});
```

### Step 3: Use in JavaScript

```javascript
const result = _my_custom_function(42, 3.14);
```

## Adding New Library Bindings

### Step 1: Add Headers to js_externs.c

```c
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui/cimgui.h"
#include "sokol/sokol_imgui.h"
#include "mylib/mylib.h"  // Add your header
```

### Step 2: Update gen_js_externs.sh

```bash
../tools/ffigen.py js js_externs.c sokol_imgui.h,cimgui.h,mylib.h > js_externs.js
../tools/ffigen.py cwrap js_externs.c sokol_imgui.h,cimgui.h,mylib.h > tmp-cwrap.c
```

### Step 3: Regenerate Bindings

```bash
cd src
./gen_js_externs.sh
```

### Step 4: Link Library in CMakeLists.txt

```cmake
target_link_libraries(jsdemo sokol stb cimgui scroller hermesvm mylib)
```

## Performance Characteristics

### Zero-Overhead FFI
- JavaScript calls to C functions compile to direct native calls
- No marshalling overhead
- No JavaScript wrapper functions
- Pointer arithmetic is native

### Compiled JavaScript
- Static Hermes compiles TypeScript/JavaScript to native machine code
- Type annotations enable better optimization
- Inline hints respected by compiler
- Comparable performance to hand-written C++ for compute tasks

### Memory Management
- C pointers accessible from JavaScript as `c_ptr` type
- Manual memory management (malloc/free) when needed
- Temporary allocations via `allocTmp()` helper
- Embedded assets compiled into binary (zero runtime overhead)

## Debugging Tips

### Enable Debug Symbols

```bash
cmake -DCMAKE_BUILD_TYPE=Debug ..
```

This passes `-g3` to shermes for full debug info.

### Check Generated Object File

```bash
objdump -t build/src/jsdemo.o | grep demo
nm build/src/jsdemo.o
```

### Inspect FFI Bindings

The generated `js_externs.js` is human-readable. Search for function names:

```bash
grep "igBegin" src/js_externs.js
```

### Common Errors

**Undefined reference to `sh_export_XXX`**
- Mismatch between `--exported-unit=XXX` and `extern "C" SHUnit sh_export_XXX`
- Must match exactly

**Type errors in JavaScript**
- Ensure FFI declarations match C function signatures
- Check pointer vs value types
- Verify `c_int`, `c_float`, `c_ptr` usage

**Segmentation faults**
- Check pointer validity before dereferencing
- Ensure strings are null-terminated (use `stringToAsciiz()`)
- Verify buffer sizes for ImVec2 and other structs

## Summary

This architecture provides:

1. **High Performance** - Compiled JavaScript with zero-overhead FFI
2. **Type Safety** - TypeScript with Static Hermes type checking
3. **Rapid Development** - JavaScript/TypeScript as primary language
4. **Native Integration** - Direct access to C libraries
5. **Automatic Bindings** - FFI generator eliminates manual binding code
6. **Cross-Platform** - Sokol provides platform abstraction

The key innovation is the FFI system that generates direct JavaScript-to-C bindings automatically, combined with Static Hermes compilation to native code, providing native performance while maintaining the productivity of JavaScript/TypeScript development.
