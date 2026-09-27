# Topo — System Topology Drawing Tool

## Goal
A local web app to draw system topology diagrams (services, DBs, queues, cloud
resources) for application projects and scaling planning.

## Decisions (confirmed with user)
- Platform: local web app (Vite dev server), not a packaged native binary
- Canvas: React Flow (drag/connect boxes, pan/zoom)
- Icons: AWS/GCP/Azure-style cloud service icon set
- Storage: File System Access API — user picks a folder, each diagram saved as
  its own `.json` file in that folder
- Node extras: free-text notes/annotations per node
- Versioning: each save also writes a timestamped snapshot to
  `.history/<diagram-name>/<timestamp>.json`; UI can list & restore snapshots
- Export: PNG export of the canvas

## Verification plan
1. `npm run dev`, open in browser, pick a folder
2. Create a diagram: drag 3+ cloud icons, connect with labeled arrows, add a
   note to one node
3. Save → confirm JSON file appears in the picked folder with correct shape
4. Reload app → confirm diagram loads back identically (nodes, edges, notes)
5. Edit + save again → confirm new history snapshot created, and restorable
   via UI
6. Export as PNG → visually matches canvas

## Build steps
- [x] Scaffold Vite + React + TypeScript project
- [x] Install React Flow, set up canvas with pan/zoom
- [x] Build cloud icon node palette (AWS/GCP/Azure subset) + drag-to-canvas
- [x] Edge creation with labels (double-click an edge to set/edit its label)
- [x] Node side panel: name, notes/annotations
- [x] Folder picker (File System Access API) + save/load diagram JSON
- [x] History snapshot on save + restore UI
- [x] PNG export
- [x] Manual verification pass — confirmed in Chrome:
      - drag icons onto canvas, select node, edit label/notes: works
      - PNG export produces a valid image in Downloads: works
      - folder picker/save/load: uses native OS directory dialog, which
        cannot be driven by browser automation — needs a manual check by
        the user (see Notes below)

## Notes
- Run with `npm run dev` (open the printed localhost URL) — this is a local
  web app, not a packaged native binary.
- File System Access API (folder picker, save/load, history) requires
  Chrome/Edge and a real user click — automated testing of that flow isn't
  possible, so please verify manually: pick a folder, save a diagram, reload
  the page, reopen it, edit + save again, then check the History dropdown.
