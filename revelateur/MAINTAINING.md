# Révélateur — maintenance notes

A photo editor in the spirit of Lightroom: every photo is analysed on the device and adjusted for its type (portrait, landscape, food, night…) and for the look it already has, then your own corrections are learned per type. First version built 16 Nov 2026; the plan is to tune it from real use.

## What is where

| File | What it does |
|------|--------------|
| `js/engine.js` | The settings (`SLIDERS`), the pipeline constants (`K`), the pipeline in JavaScript (`process`), the measurements (`analyze`), the existing-look detection, the auto-adjust rules and the taste learning. Pure functions. |
| `js/scenes.js` | The 13 scene types and their targets (`PROFILES`), the ImageNet labels grouped into scene types, and `classify` (faces + labels + measurements). |
| `js/gl.js` | WebGL2 renderer. The shader is generated from `K` and does exactly what `process` does. Display (zoom and pan) and the full-size export in strips. |
| `js/jpeg.js` | JPEG encoder (no canvas, so 24 and 48 MP photos export at full size on the iPhone), Exif copy (rotation reset, thumbnail dropped, place optional) and a Display P3 ICC profile. |
| `js/vision.js` | MediaPipe face detector and image classifier, loaded from jsDelivr and Google's model storage, then cached by the service worker. |
| `js/geo.js` | Crop, straighten and rotate (`geo` on each photo): the output size and the 2×2 matrix the shader uses to map each output pixel back to the photo. Straightening zooms in just enough that no empty corner shows. Pure functions. |
| `js/photo.js` | Import (decode, measure, recognise, auto, preview), the settings of a photo, export. |
| `js/library.js` | IndexedDB: originals, previews, measurements, edits. Stays on the device. |
| `js/store.js` | Settings, presets and the learned taste in one localStorage key, synced by `cloud.js` (app key `revelateur`). |
| `js/ui.js` | Library, Editor, Settings. |
| `test/revelateur.test.mjs` | `node --test revelateur/test/*.mjs` — 18 checks on synthetic images, crop and straighten included. |

## How a photo's settings are made

`settings = auto × strength + learned taste + your own changes`

- **auto**: `autoAdjust(measurements, profile)`. Each line of the "why" list in the Auto panel comes from one rule there.
- **strength**: the Auto strength slider (default in Settings).
- **learned taste**: `tasteOffset(samples, scene)`. A sample is what you changed after the auto on one photo, saved when you leave a photo you edited or exported. The offset for a type is the recency-weighted mean of its samples (last 40 per type) × n/(n+2), plus a small share of the mean over all types. Samples are keyed by photo, so the iPhone and the Mac merge cleanly.
- **your changes**: stored separately (`manual`), so changing the scene type or the strength keeps them.
- **crop, straighten and rotate**: stored apart from the settings (`geo`), never learned into the taste. The measurements and the auto use the whole photo; the crop only changes what is shown and exported. Undo and Reset cover it.

## The rules worth tuning first

| Rule | Where | Now |
|------|-------|-----|
| Target brightness per type | `PROFILES[*].key` | portrait 0.46, landscape 0.45, snow 0.74, night 0.26 |
| Exposure | `autoAdjust` | 70 % of the way to the target; darkening halved and capped at −0.35 EV unless more than 1 % is clipped |
| Faces | `autoAdjust` | no fixed skin brightness (skin tones differ); a face in normal light caps the exposure at +0.4 EV, a backlit face is lifted halfway to the scene |
| Colour cast | `analyze` | near-neutral pixels (saturation < 0.13, sky excluded); too few → the brightest unclipped pixels, at 40 % confidence |
| Existing look | `detectLook` | black and white, faded blacks, split toning, punchy, soft faded; any of these lowers the corrections by up to 60 % |
| Golden hour | `autoAdjust` | warm cast + warm pixels in sunset, landscape or water photos: at most 15 % of the cast removed |
| Scene evidence | `classify` | big face 1.2, three faces 1.0, label score × 2, measurements × 0.6; faces count 25 % when a pet label is present (the detector finds dog faces) |

After a change, run the checks and look at real photos before and after.

## Things that are not computed

- No RAW files and no local masks (sky, subject) yet: the plan is a later version with segmentation models.
- The classifier knows ImageNet objects, not scenes as such: a hand pointing up can read as "ice lolly". The scene chip in the editor fixes that in one tap, and "Look again with the models" re-runs it.

## Data and privacy

Photos and edits stay in the browser (IndexedDB) on each device. Only settings, presets and the learned taste (setting names and numbers, no images) go to your Supabase project. The models run in the page; no photo is sent anywhere. Exports keep the camera's Exif (date, camera, lens, place) unless switched off in Settings.

## After changing a file

Bump `V` in `sw.js` so phones fetch the new version. The model cache (`revelateur-models-1`) only needs a new name when `MP_VER` in `vision.js` changes.
