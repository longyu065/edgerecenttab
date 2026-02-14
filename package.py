"""
Edge Recent Tab Extension - Python Packaging Script
Creates a ZIP package for Edge Add-ons submission
"""
import os
import zipfile
from pathlib import Path

# Files to include in the package
FILES_TO_INCLUDE = [
    'manifest.json',
    'background.js',
    'float.js',
    'float.css',
    'history.html',
    'history.css',
    'history.js',
    'popup.html',
    'popup.css',
    'popup.js',
    'icons/icon.svg',
    'README.md'
]

# Files and directories to exclude
EXCLUDE = [
    '.claude',
    'create_icons.py',
    'icons/README.md',
    'package.js',
    'create-zip.js',
    'package.bat',
    'package.py',
    'edgerecenttab.zip',
    'edgerecenttab.tar.gz',
    'nul',
    '.git',
    '__pycache__'
]


def create_package():
    """Create the Edge extension package"""
    project_root = Path(__file__).parent
    zip_path = project_root / 'edgerecenttab.zip'

    # Remove existing zip if it exists
    if zip_path.exists():
        print(f"Removing existing package: {zip_path}")
        zip_path.unlink()

    print("Creating Edge extension package...")
    print("\nFiles to include:")
    for file in FILES_TO_INCLUDE:
        print(f"  - {file}")
    print()

    # Create ZIP file
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for file_path in FILES_TO_INCLUDE:
            full_path = project_root / file_path

            if not full_path.exists():
                print(f"Warning: {file_path} not found, skipping...")
                continue

            print(f"Adding: {file_path}")
            zf.write(full_path, file_path)

    print(f"\n✓ Package created successfully: {zip_path}")
    print(f"  Size: {zip_path.stat().st_size:,} bytes")

    # List contents for verification
    print("\nPackage contents:")
    with zipfile.ZipFile(zip_path, 'r') as zf:
        for info in zf.infolist():
            print(f"  {info.filename} ({info.file_size:,} bytes)")
    print(f"\nTotal files: {len(zf.namelist())}")


if __name__ == '__main__':
    create_package()
    input("\nPress Enter to exit...")
