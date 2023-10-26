const c_null = $SHBuiltin.c_null();

// stdlib.h
const _malloc = $SHBuiltin.extern_c({include: "stdlib.h"}, function malloc(size: c_size_t): c_ptr {
    throw 0;
});
const _free = $SHBuiltin.extern_c({include: "stdlib.h"}, function free(p: c_ptr): void {
});

// Pointer access builtins.
const _ptr_write_char = $SHBuiltin.extern_c({declared: true}, function _sh_ptr_write_char(ptr: c_ptr, offset: c_int, v: c_char): void {
});
const _ptr_read_uchar = $SHBuiltin.extern_c({declared: true}, function _sh_ptr_read_uchar(ptr: c_ptr, offset: c_int): c_uchar {
    throw 0;
});

/// Allocate native memory using malloc() or throw an exception.
function malloc(size: number): c_ptr {
    "inline";
    "use unsafe";

    let res = _malloc(size);
    if (res === 0) throw Error("OOM");
    return res;
}

/// Convert a JS string to ASCIIZ.
function stringToAsciiz(s: any): c_ptr {
    "use unsafe";

    if (typeof s !== "string") s = String(s);
    let buf = malloc(s.length + 1);
    try {
        let i = 0;
        for (let e = s.length; i < e; ++i) {
            let code: number = s.charCodeAt(i);
            if (code > 127) throw Error("String is not ASCII");
            _ptr_write_char(buf, i, code);
        }
        _ptr_write_char(buf, i, 0);
        return buf;
    } catch (e) {
        _free(buf);
        throw e;
    }
}

