/*
* Copyright (c) Tzvetan Mikov.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
 */

#define SOKOL_IMPL
#define SOKOL_NO_ENTRY // We define our own main() function
#include "sokol_app.h"
//#include "sokol_audio.h"
#include "sokol_gfx.h"
#include "sokol_glue.h"
#include "sokol_log.h"
#include "sokol_time.h"

// Must be separate to avoid reordering.
#include "sokol_debugtext.h"
