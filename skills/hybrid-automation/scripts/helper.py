#!/usr/bin/env python3
"""Hybrid automation helper scripts."""

import pyautogui
import time
import shutil
import os
import sys

def prepare_file(source_file, temp_dir=None):
    """Copy file to temp directory for upload."""
    if temp_dir is None:
        temp_dir = r'C:\Users\ADMINI~1\AppData\Local\Temp\openclaw\uploads'
    
    os.makedirs(temp_dir, exist_ok=True)
    filename = os.path.basename(source_file)
    dest = os.path.join(temp_dir, filename)
    shutil.copy(source_file, dest)
    return dest

def upload_file(file_path, wait=2):
    """Type file path in dialog and press Enter."""
    time.sleep(wait)
    pyautogui.write(file_path)
    time.sleep(0.3)
    pyautogui.press('enter')

def copy_text(text):
    """Copy text to clipboard."""
    pyautogui.write(text)
    time.sleep(0.3)

def hotkey(*keys):
    """Press keyboard shortcut."""
    pyautogui.hotkey(*keys)
    time.sleep(0.3)

def screenshot(filename="debug.png"):
    """Take screenshot for debugging."""
    return pyautogui.screenshot(filename)

if __name__ == "__main__":
    # CLI interface
    if len(sys.argv) < 2:
        print("Usage: python helper.py <command> [args]")
        print("Commands:")
        print("  prepare <file>     - Copy file to temp dir")
        print("  upload <path>     - Type path in dialog")
        print("  copy <text>       - Copy text")
        print("  hotkey <keys...>  - Press shortcut (e.g., ctrl,c)")
        print("  screenshot [name]  - Take screenshot")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "prepare" and len(sys.argv) > 2:
        result = prepare_file(sys.argv[2])
        print(result)
    
    elif cmd == "upload" and len(sys.argv) > 2:
        upload_file(sys.argv[2])
        print("Done")
    
    elif cmd == "copy" and len(sys.argv) > 2:
        copy_text(sys.argv[2])
        print("Done")
    
    elif cmd == "hotkey" and len(sys.argv) > 2:
        hotkey(*sys.argv[2:])
        print("Done")
    
    elif cmd == "screenshot":
        name = sys.argv[2] if len(sys.argv) > 2 else "debug.png"
        screenshot(name)
        print(f"Saved to {name}")
    
    else:
        print("Unknown command")
        sys.exit(1)
