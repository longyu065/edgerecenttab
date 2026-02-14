import struct

def create_simple_png(filename, size):
    # Create a simple solid color PNG
    # Using a valid PNG structure

    # PNG signature
    png_sig = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    ihdr_crc = 0x66029063  # Pre-calculated CRC for this IHDR
    ihdr_chunk = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)

    # IDAT chunk - simplest 1x1 pixel
    idat_data = b'\x78\x9c\x01\x00\x00\xff\xff\x00\x00\x00\x02\x00\x01'  # deflate data
    idat_crc = 0x842f884d  # Pre-calculated CRC
    idat_chunk = struct.pack('>I', len(idat_data)) + b'IDAT' + idat_data + struct.pack('>I', idat_crc)

    # IEND chunk
    iend_crc = 0xae426082
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)

    # Write PNG file
    with open(filename, 'wb') as f:
        f.write(png_sig)
        f.write(ihdr_chunk)
        f.write(idat_chunk)
        f.write(iend_chunk)

    print(f'Created {filename}')

# Create all icon sizes
for size in [16, 32, 48, 128]:
    create_simple_png(f'D:/github/edgerecenttab/icons/icon{size}.png', size)
