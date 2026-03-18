---
name: hybrid-automation
description: |
  Hybrid browser + desktop automation for complex web tasks. Use when: (1) Browser automation alone cannot complete the task (2) Need to handle system dialogs, file uploads, or native OS interactions (3) Combining multiple automation tools for seamless workflow. Examples: file uploads requiring system dialogs, clipboard operations, keyboard shortcuts, handling verification codes.
---

# Hybrid Automation

Combine browser automation with desktop automation (pyautogui) for tasks that neither can do alone.

## When to Use

- File upload dialogs that browser automation can't handle
- System-level interactions (copy/paste, keyboard shortcuts)
- Handling verification codes or CAPTCHAs
- Complex multi-step flows requiring both browser and OS actions

## Core Workflow

```
1. Analyze task → Determine which tool for each step
2. Browser first → Handle web interactions
3. Switch to desktop → Handle system dialogs
4. Return to browser → Continue web flow
5. Verify → snapshot to confirm results
```

## Tool Selection Guide

| Task | Tool | Example |
|------|------|---------|
| Web navigation | browser | Click buttons, fill forms |
| File selection dialog | pyautogui | Type path, press enter |
| Copy/paste | pyautogui | Copy text, paste in another app |
| Keyboard shortcuts | pyautogui | Ctrl+C, Ctrl+V, Alt+Tab |
| Verify results | browser snapshot | Check page state |

## Browser Automation

Standard browser automation for web tasks:

```python
# Navigate and snapshot
browser(action="navigate", url="https://example.com", targetId="xxx")
browser(action="snapshot", targetId="xxx")

# Click and verify
browser(action="act", request={"kind": "click", "ref": "e123"}, targetId="xxx")
browser(action="snapshot", targetId="xxx")
```

## Desktop Automation (pyautogui)

For system-level interactions:

### File Upload Pattern

```python
import pyautogui
import time
import shutil
import os

# 1. Prepare file if needed (some sites restrict paths)
temp_dir = r'C:\Users\ADMINI~1\AppData\Local\Temp\openclaw\uploads'
os.makedirs(temp_dir, exist_ok=True)
shutil.copy(source_file, os.path.join(temp_dir, filename))

# 2. Wait for dialog
time.sleep(2)

# 3. Type path and enter
pyautogui.write(full_path)
pyautogui.press('enter')
```

### Keyboard Shortcuts

```python
# Copy/Paste
pyautogui.hotkey('ctrl', 'c')
pyautogui.hotkey('ctrl', 'v')

# Select all
pyautogui.hotkey('ctrl', 'a')

# Switch windows
pyautogui.hotkey('alt', 'tab')
```

### Screenshot for Debugging

```python
pyautogui.screenshot('debug.png')
```

## Seamless Integration

### Switching Between Tools

```python
# Browser → Desktop
browser(action="act", request={"kind": "click", "ref": "e45"}, targetId="xxx")
# Wait for dialog
time.sleep(1)
# Desktop automation
pyautogui.write(file_path)
pyautogui.press('enter')
# Back to browser
browser(action="snapshot", targetId="xxx")
```

### Verification Loop

Always verify after tool switching:

```python
browser(action="snapshot", targetId="xxx")
# Check for: preview image, error messages, page changes
# If failed → retry or fallback
```

## Common Patterns

### Pattern 1: File Upload

1. browser: Click upload button
2. pyautogui: Type file path, press Enter
3. browser: snapshot verify (look for preview or error)

### Pattern 2: Verification Code

1. browser: Navigate to page, trigger code sending
2. pyautogui: Switch to messaging app, copy code
3. pyautogui: Switch back to browser
4. browser: Paste code, submit

### Pattern 3: Download → Process → Upload

1. browser: Click download button
2. pyautogui: Handle save dialog, specify path
3. exec: Run processing script on file
4. browser: Navigate to upload page
5. pyautogui: Handle upload dialog
6. browser: Verify upload

## Error Handling

- **Dialog didn't appear**: Add more wait time
- **Wrong element clicked**: snapshot and re-identify
- **pyautogui not working**: Check window focus
- **Upload failed**: Check file format/size restrictions

## Setup

```bash
pip install pyautogui
```

## References

- [pyautogui docs](https://pyautogui.readthedocs.io/)
- See scripts/upload_helper.py for reusable upload logic
