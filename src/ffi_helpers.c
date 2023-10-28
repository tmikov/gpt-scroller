#include <stdbool.h>

char _sh_ptr_read_c_char(char *ptr, int offset) {
  return *(char *)(ptr + offset);
}
void _sh_ptr_write_c_char(char *ptr, int offset, char v) {
  *(char *)(ptr + offset) = v;
}
signed char _sh_ptr_read_c_schar(char *ptr, int offset) {
  return *(signed char *)(ptr + offset);
}
void _sh_ptr_write_c_schar(char *ptr, int offset, signed char v) {
  *(signed char *)(ptr + offset) = v;
}
unsigned char _sh_ptr_read_c_uchar(char *ptr, int offset) {
  return *(unsigned char *)(ptr + offset);
}
void _sh_ptr_write_c_uchar(char *ptr, int offset, unsigned char v) {
  *(unsigned char *)(ptr + offset) = v;
}
short int _sh_ptr_read_c_short(char *ptr, int offset) {
  return *(short int *)(ptr + offset);
}
void _sh_ptr_write_c_short(char *ptr, int offset, short int v) {
  *(short int *)(ptr + offset) = v;
}
short unsigned int _sh_ptr_read_c_ushort(char *ptr, int offset) {
  return *(short unsigned int *)(ptr + offset);
}
void _sh_ptr_write_c_ushort(char *ptr, int offset, short unsigned int v) {
  *(short unsigned int *)(ptr + offset) = v;
}
int _sh_ptr_read_c_int(char *ptr, int offset) {
  return *(int *)(ptr + offset);
}
void _sh_ptr_write_c_int(char *ptr, int offset, int v) {
  *(int *)(ptr + offset) = v;
}
unsigned int _sh_ptr_read_c_uint(char *ptr, int offset) {
  return *(unsigned int *)(ptr + offset);
}
void _sh_ptr_write_c_uint(char *ptr, int offset, unsigned int v) {
  *(unsigned int *)(ptr + offset) = v;
}
long int _sh_ptr_read_c_long(char *ptr, int offset) {
  return *(long int *)(ptr + offset);
}
void _sh_ptr_write_c_long(char *ptr, int offset, long int v) {
  *(long int *)(ptr + offset) = v;
}
long unsigned int _sh_ptr_read_c_ulong(char *ptr, int offset) {
  return *(long unsigned int *)(ptr + offset);
}
void _sh_ptr_write_c_ulong(char *ptr, int offset, long unsigned int v) {
  *(long unsigned int *)(ptr + offset) = v;
}
long long int _sh_ptr_read_c_longlong(char *ptr, int offset) {
  return *(long long int *)(ptr + offset);
}
void _sh_ptr_write_c_longlong(char *ptr, int offset, long long int v) {
  *(long long int *)(ptr + offset) = v;
}
long long unsigned int _sh_ptr_read_c_ulonglong(char *ptr, int offset) {
  return *(long long unsigned int *)(ptr + offset);
}
void _sh_ptr_write_c_ulonglong(char *ptr, int offset, long long unsigned int v) {
  *(long long unsigned int *)(ptr + offset) = v;
}
bool _sh_ptr_read_c_bool(char *ptr, int offset) {
  return *(bool *)(ptr + offset);
}
void _sh_ptr_write_c_bool(char *ptr, int offset, bool v) {
  *(bool *)(ptr + offset) = v;
}
float _sh_ptr_read_c_float(char *ptr, int offset) {
  return *(float *)(ptr + offset);
}
void _sh_ptr_write_c_float(char *ptr, int offset, float v) {
  *(float *)(ptr + offset) = v;
}
double _sh_ptr_read_c_double(char *ptr, int offset) {
  return *(double *)(ptr + offset);
}
void _sh_ptr_write_c_double(char *ptr, int offset, double v) {
  *(double *)(ptr + offset) = v;
}
char *_sh_ptr_read_c_ptr(char *ptr, int offset) {
  return *(char **)(ptr + offset);
}
void _sh_ptr_write_c_ptr(char *ptr, int offset, char *v) {
  *(char **)(ptr + offset) = v;
}
char *_sh_ptr_add(char *ptr, int offset) {
  return ptr + offset;
}
