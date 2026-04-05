# Changelog

## [Unreleased]
### Added
- Custom frameless window implementation with `Titlebar` component
- Project tracking documentation (PLAN.md, CHANGELOG.md, VERSION, DECISIONS.md)

### Changed
- UI layout redesigned to match VS Code / Cursor aesthetic with cleaner toolbar, tab headers, and contextual breadcrumbs
- Disabled OS default window decorations in `tauri.conf.json`
- Enabled `renderMarginRevertIcon` in Monaco Editor to allow accepting/reverting diff blocks

---

## [0.1.0] — 2026-04-06
### Added
- Initial project scaffold with Tauri 2, React, and Monaco Editor
- Text and File comparison modes
- Drag & Drop support for files
- Basic inline diffing, syntax highlighting, and navigation
- Light and dark themes support