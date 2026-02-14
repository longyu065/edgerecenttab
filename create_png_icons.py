import struct
import zlib

def create_simple_icon(size, filename):
    """Create a simple PNG icon with gradient and basic shapes"""
    
    # Create pixel data
    pixels = []
    
    # Gradient colors (purple-blue)
    for y in range(size):
        row = []
        for x in range(size):
            # Create gradient from top to bottom
            ratio = y / size
            r = int(102 * (1 - ratio) + 118 * ratio)
            g = int(126 * (1 - ratio) + 75 * ratio)
            b = int(234 * (1 - ratio) + 162 * ratio)
            a = 255
            row.extend([r, g, b, a])
        pixels.extend(row)
    
    # Compress the pixel data
    raw_data = bytes(pixels)
    scanlines = []
    for y in range(size):
        scanlines.append(b'\x00')  # Filter type 0 (None)
        scanlines.append(raw_data[y * size * 4:(y + 1) * size * 4])
    
    scanline_data = b''.join(scanlines)
    compressed_data = zlib.compress(scanline_data, 9)
    
    # PNG signature
    png_sig = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    ihdr_chunk = _make_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk
    idat_chunk = _make_chunk(b'IDAT', compressed_data)
    
    # IEND chunk
    iend_chunk = _make_chunk(b'IEND', b'')
    
    # Write PNG file
    with open(filename, 'wb') as f:
        f.write(png_sig)
        f.write(ihdr_chunk)
        f.write(idat_chunk)
        f.write(iend_chunk)
    
    print(f'Created {filename} ({size}x{size})')

def _make_chunk(chunk_type, data):
    """Create a PNG chunk"""
    length = struct.pack('>I', len(data))
    crc = zlib.crc32(chunk_type + data) & 0xffffffff
    crc_bytes = struct.pack('>I', crc)
    return length + chunk_type + data + crc_bytes

# Create all icon sizes
if __name__ == '__main__':
    sizes = [16, 32, 48, 128]
    for size in sizes:
        create_simple_icon(size, f'icons/icon{size}.png')
    print(f'\nAll icons created successfully!')