## Task ID: 2 - massive-upgrade
### Work Task
Massive upgrade of VenAI with Big Tech flat design, file manager enhancement, new API routes, and new UI panels.

### Work Summary

**1. GLOBAL CSS OVERHAUL (globals.css):**
- Removed position: fixed from html, body - replaced with height: 100dvh (CRITICAL FIX for header)
- Removed all gradient/glass/glow classes, replaced with flat design tokens
- Updated dark theme to neutral tones (hue 260)

**2. CHAT INTERFACE REWRITE:**
- Flat header with Model Finder + Image Gen buttons
- Flat message bubbles, collapsible thinking with ReactMarkdown
- Enhanced file manager: inline dialogs, multi-file tabs, tree view
- New ModelFinderPanel, voice recording, image generation

**3. NEW API ROUTES:** image, voice (TTS/STT), models (HF search + Ollama)

**4. BUILD: 0 lint errors in all modified files**
