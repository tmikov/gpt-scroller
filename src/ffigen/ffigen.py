#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from collections import OrderedDict

# Initialize a global ordered dictionary to hold the constants
constants_dict = OrderedDict()


def read_xml_from_castxml(filename):
    # Read the file and look for #define statements
    with open(filename, "r") as f:
        for line in f:
            match = re.match(r"\s*#\s*define\s+(\w+)\s+(\d+)\s*(?:/\*|//|$)", line)
            if match:
                name, number = match.groups()
                constants_dict[name] = number

    # Run castxml
    xml_output = subprocess.run(
        ["castxml", "--castxml-gccxml", "-o", "-", filename],
        capture_output=True,
        text=True,
    ).stdout

    return ET.fromstring(xml_output)


def read_xml_from_file(filename):
    return ET.parse(filename).getroot()


# A simple mapping of common C types to their Static Hermes equivalents.
simple_type_mapping = {
    "char": "c_char",
    "signed char": "c_schar",
    "unsigned char": "c_uchar",
    "short int": "c_short",
    "short unsigned int": "c_ushort",
    "int": "c_int",
    "unsigned int": "c_uint",
    "long int": "c_long",
    "long unsigned int": "c_ulong",
    "long long int": "c_longlong",
    "long long unsigned int": "c_ulonglong",
    "bool": "c_bool",
    "float": "c_float",
    "void": "void",
    "double": "c_double",
}

# Mapping from the ID for a type to its XML element.
id_to_element = {}

# Mapping from the ID for a type to the corresponding type name in SH.
def to_sh_name(id):
    elem = id_to_element[id]

    if elem.tag == "FundamentalType":
        return simple_type_mapping.get(elem.get("name"))
    if elem.tag == "Enumeration":
        return "c_int"
    if elem.tag == "PointerType":
        return "c_ptr"
    if elem.tag == "ArrayType":
        return "c_ptr"

    # Structs and unions are converted to be passed as pointers.
    if elem.tag == "Struct":
        return "c_ptr"
    if elem.tag == "Union":
        return "c_ptr"

    return "UNKNOWN_TYPE"

# Mapping from the ID for a type to the corresponding type name in C.
def to_c_name(id):
    elem = id_to_element[id]

    if elem.tag == "FundamentalType":
        return elem.get("name")
    if elem.tag == "Enumeration":
        return elem.get("name")
    if elem.tag == "PointerType":
        return to_c_name(elem.get("type")) + "*"
    if elem.tag == "Struct":
        return elem.get("name")
    if elem.tag == "Union":
        return  elem.get("name")
    if elem.tag == "ArrayType":
        return to_c_name(elem.get("type")) + "*"

    return "UNKNOWN_TYPE"

# Whether a type needs to be wrapped and passed by pointer.
def need_cwrap(id):
    return id_to_element[id].tag == "Struct" or id_to_element[id].tag == "Union"

# Get the filename from the command line arguments
if len(sys.argv) < 3:
    print("Usage: ffigen.py <cwrap|js> <filename>")
    sys.exit(1)
mode = sys.argv[1]
filename = sys.argv[2]

# Read XML tree either from the file or by running castxml
if filename.endswith(".xml"):
    root = read_xml_from_file(filename)
else:
    root = read_xml_from_castxml(filename)

# Collect all of the type declarations.
for tag in ["Struct", "Enumeration", "FundamentalType", "PointerType", "Union", "ArrayType"]:
    for elem in root.findall(".//" + tag):
        id_to_element[elem.get("id")] = elem

# Collect typedefs and associate their id with the underlying type.
for typedef in root.findall(".//Typedef"):
    type_id = typedef.get("id")
    id_to_element[type_id] = id_to_element[typedef.get("type")]

if mode == "js":
    # Generate JS declarations
    for func in root.findall(".//Function"):
        name = func.get("name")
        args = []

        # If the return value is a struct or union, return void and add an out
        # parameter.
        return_cwrap = need_cwrap(func.get("returns"))
        if return_cwrap:
            return_type = "void"
            args.append(f"_out: c_ptr")
        else:
            return_type = to_sh_name(func.get("returns"))

        # If the return value or any argument needs wrapping, then generate
        # a wrapper.
        do_cwrap = return_cwrap

        for arg in func.findall(".//Argument"):
            if need_cwrap(arg.get("type")):
                do_cwrap = True
            
            # Emit each parameter in the SH signature.
            arg_name = arg.get("name")
            arg_type = to_sh_name(arg.get("type"))
            if arg_name:
                args.append(f"{arg_name}: {arg_type}")
            else:
                args.append(f"_{len(args)}: {arg_type}")

        js_declaration = (
            "const _"
            + name
            + " = $SHBuiltin.extern_c({}, function "
            + name 
            + ("_cwrap" if do_cwrap else "")
            + "("
            + ", ".join(args)
            + "): "
            + return_type
            + " { throw 0; });"
        )
        print(js_declaration)

    # Generate JS constants from the ordered dictionary
    if len(constants_dict):
        print()
    for name, value in constants_dict.items():
        print(f"const _{name} = {value};")
    
    # Generate JS constants from enum values.
    for enum in root.findall(".//Enumeration"):
        enum_name = enum.get("name")
        for enum_value in enum.findall(".//EnumValue"):
            enum_value_name = enum_value.get("name")
            enum_value_value = enum_value.get("init")
            print(f"const _{enum_name}_{enum_value_name} = {enum_value_value};")
elif mode == "cwrap":
    # Generate C declarations
    for func in root.findall(".//Function"):
        return_id = func.get("returns")

        # C declaration is only needed if the function either accepts or returns a
        # struct by value.
        do_cwrap = need_cwrap(return_id)
        for arg in func.findall(".//Argument"):
            if need_cwrap(arg.get("type")):
                do_cwrap = True
        if not do_cwrap:
            continue

        func_name = func.get("name")

        # The parameters that the wrapper accepts.
        params = []

        # The body of the generated wrapper.
        body = ""
        
        # If the return type requires wrapping, add an out parameter and
        # populate it with the result of the call.
        if need_cwrap(return_id):
            return_type = "void"
            params.append(to_c_name(return_id) + f"* a0")
            body += "*a0 = "
        else:
            return_type = to_c_name(return_id)
            body += "return "

        body += func_name + "("

        # The arguments to the call to the wrapped function.
        args = []
        for arg in func.findall(".//Argument"):
            n = len(params)
            # If the parameter type requires wrapping, accept it as a pointer
            # and dereference it.
            if need_cwrap(arg.get("type")):
                params.append(to_c_name(arg.get("type")) + f"* a{n}")
                args.append(f"*a{n}")
            else:
                params.append(to_c_name(arg.get("type")) +f" a{n}")
                args.append(f"a{n}")
        
        body += ", ".join(args)
        body += ");\n"

        print(f"{return_type} {func_name}_cwrap({', '.join(params)}){{\n  " + body + "}")