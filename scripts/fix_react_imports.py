#!/usr/bin/env python3
"""Remove unused `import React from 'react'` lines from JSX/JS files.
Only touches files where React is imported but never referenced as React.*.
"""
import os
import re
import sys

ROOT = r"C:\Users\NavGurukul\OneDrive\Desktop\chatApp\frontend\src"

removed = 0
skipped = []

for dirpath, _dirnames, filenames in os.walk(ROOT):
    if "node_modules" in dirpath or "dist" in dirpath:
        continue
    for fn in filenames:
        if not (fn.endswith(".jsx") or fn.endswith(".js")):
            continue
        path = os.path.join(dirpath, fn)
        with open(path, encoding="utf-8", errors="replace") as f:
            content = f.read()

        # Does the file use React.X anywhere (outside the import line)?
        body_without_import = re.sub(r"^import React.*from ['\"]react['\"];\s*$", "", content, flags=re.M)
        uses_react = bool(re.search(r"\bReact\.", body_without_import))

        m = re.search(r"^import React(, (\{[^}]*\}))? from ['\"]react['\"];\s*$", content, flags=re.M)
        if not m:
            continue

        if uses_react:
            skipped.append((path, "uses React."))
            continue

        if m.group(2):  # import React, { X } from 'react'
            named = m.group(2).strip()
            new_line = f"import {named} from 'react';"
            content = content[: m.start()] + new_line + content[m.end():]
        else:
            content = content[: m.start()] + content[m.end():]

        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(content)
        removed += 1
        print(f"FIXED: {os.path.relpath(path, ROOT)}")

print(f"\nRemoved/rewrote React import in {removed} files")
if skipped:
    print("Skipped (still uses React.):")
    for s in skipped:
        print("  ", s)
