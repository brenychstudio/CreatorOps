# CreatorOps Media Converter Decision

## 1. Decision

Decision: Build Media Converter inside CreatorOps as a local-first Media Tools module.

CreatorOps will add `Media Tools -> Media Converter` as a local-first utility module.

Clarifications:

- It starts inside CreatorOps.
- It is not a separate SaaS yet.
- It is not part of the core Week Pack flow.
- It can work before Library, before Export Pack, or independently.
- It must remain reusable for PBS or standalone products later.

CreatorOps is the first product shell. Media Converter must remain a reusable image-processing module.

Task 22B - Supabase Project Setup Checklist remains important and postponed. It is not cancelled. This decision record only confirms the Media Converter placement before the auth/database stage continues.

## 2. Why CreatorOps is the First Home

CreatorOps is the right first home because it already works with visual assets.

The converter naturally fits the broader creator workflow:

```txt
Import assets -> Prepare images -> Resize / convert / optimize -> Use in content -> Export pack
```

Media Converter should not become the main CreatorOps product. It is a useful utility that supports the workspace before Library, before Export Pack, or as an independent tool.

## 3. Product Positioning

User-facing promise:

```txt
Prepare images for websites, social media, portfolios and downloads.
Files stay on your device.
```

Short UI promise:

```txt
Add images
Choose result
Convert
Download
```

Privacy copy:

```txt
Your images are processed locally in your browser and are not uploaded.
```

The audience is not primarily developers. The UI should explain actions through outcomes, not technical implementation details.

## 4. Core Product Rule

Core rule:

```txt
Simple outside. Structured inside.
```

Outside:

- simple drag and drop
- clear presets
- minimal technical words
- fast ZIP export

Inside:

- separate processing engine
- format adapters
- validation layer
- preset system
- queue system
- export adapter
- future SaaS / desktop adapters

The converter must not become a technical dashboard. The product surface should remain calm, direct, and task-based.

## 5. Placement

Decision:

```txt
CreatorOps -> Media Tools -> Media Converter
```

Do not place it as:

```txt
Export -> Prepare Images
```

Reason:

```txt
Media Converter is not only an export feature. It can work before Library, before Export Pack, or independently.
```

Future `Media Tools` can include:

- Image Resizer
- Background Cleaner
- Cover Maker
- Format Converter
- Batch Optimizer
- Export Pack Builder

## 6. V1 Scope

Input formats:

- JPG / JPEG
- PNG
- WebP

Output formats:

- JPG
- PNG
- WebP

V1 features:

- Drag and drop images
- Multiple file upload
- Batch queue
- Preview list
- Output format selector
- Quality slider
- Resize controls
- Transparency handling
- Background color for JPG
- File size before / after
- Convert selected
- Convert all
- Download ZIP
- Clear queue
- Error states
- Basic conversion report

JPG, PNG, and WebP are the stable first MVP formats. AVIF and TIFF belong to a later v1.5 or advanced path.

## 7. User-Facing Presets

Use task-based presets:

- Make smaller
- Website ready
- Social media ready
- Keep best quality
- Transparent image
- Archive copy

Avoid technical preset names:

- Cloudflare Safe
- XR Texture
- AVIF codec
- WASM pipeline
- Sharp backend
- edge optimized

Presets should describe the result a creator wants, not the technical pipeline behind it.

## 8. Out of Scope for V1

Do not include in the first version:

- PSD
- SVG tracing
- RAW camera files
- AI upscale
- AI background removal
- cloud storage
- conversion history
- team collaboration
- public file sharing
- Stripe billing
- standalone landing
- API access
- desktop installer

This anti-scope list protects the CreatorOps SaaS foundation from being delayed by a utility module.

## 9. Local-First Privacy Model

V1 policy:

- Files are not uploaded.
- Conversion happens locally.
- There is no server-side image storage.
- There is no image history.
- There are no shared links.
- ZIP is generated on device.

The server should not receive:

- original images
- converted images
- filenames unless explicitly needed
- image content
- private metadata

The local-first privacy model is part of the product promise, not only an implementation detail.

## 10. Architecture Principle

Architecture principle:

```txt
CreatorOps shell != Converter engine
```

CreatorOps shell owns:

- navigation
- layout
- theme
- user plan context
- product copy

Media Converter module owns:

- file intake
- queue
- processing
- presets
- validation
- export
- local privacy logic

Recommended high-level module shape:

```txt
src/modules/media-converter/
  core/
  engines/
  workers/
  presets/
  ui/
  export/
  adapters/
```

The module should be designed so CreatorOps can host it first without making the engine CreatorOps-specific.

## 11. Processing Architecture

V1 processing flow:

```txt
User selects files
-> File API receives local files
-> files are validated
-> jobs are created
-> Web Worker processes queue
-> image is decoded
-> image is resized if needed
-> image is encoded to target format
-> result Blob is returned
-> ZIP is created locally
-> user downloads ZIP
```

Principle:

```txt
UI must not freeze. Heavy conversion should move into Web Worker after basic module foundation.
```

The queue should support controlled conversion, progress states, and failure states without blocking the main interface.

## 12. UX Workflow

Empty state:

```txt
Drop your images here
or choose files from your computer

Convert, resize and prepare images.
Files stay on your device.
```

After adding files, show batch cards or a compact table with:

- thumbnail
- filename
- current format
- dimensions
- original size
- target preset
- target format
- status
- estimated/new size

Settings:

- Choose result
- Make smaller
- Website ready
- Social media ready
- Keep best quality
- Custom

Advanced settings are collapsed by default:

- Format
- Quality
- Resize
- Background
- Transparency
- Filename

Final actions:

- Convert all
- Download ZIP
- Clear

## 13. Error Handling

User-facing error states:

- `unsupported-file-type`
- `file-too-large`
- `decode-failed`
- `encode-failed`
- `browser-format-unsupported`
- `worker-crashed`
- `zip-failed`
- `memory-limit`
- `transparent-to-jpg-needs-background`

User copy examples:

```txt
This file type is not supported yet.
This image is too large for browser conversion.
Your browser cannot export this format. Try PNG or WebP.
Transparent images need a background when converting to JPG.
```

The UI should not expose raw developer errors.

## 14. Quality Safeguards

Safeguards:

- Always preserve proportions by default.
- No stretch by default.
- No crop by default.
- If converting transparent PNG/WebP to JPG, show a background color option.
- Default JPG background is white.
- Remove metadata for web/social presets.
- Limit max file size and batch size.
- Release object URLs after use.

These safeguards protect visual quality, browser memory, and user trust.

## 15. SaaS / Plan Logic

For v1:

```txt
Do not block behind billing.
Include as Free/Basic utility.
Build feature flags now, enforce monetization later.
```

Suggested Free / Basic access:

- JPG / PNG / WebP
- up to 20 files per batch
- ZIP export
- basic presets

Possible Pro access later:

- larger batches
- AVIF
- TIFF
- saved presets
- higher max dimensions
- conversion reports
- send to CreatorOps Library
- export packs

The first version should not require Stripe or paid subscription logic.

## 16. Integration Roadmap

V1:

- Standalone tool inside CreatorOps
- No dependency on CreatorOps Library

V1.5:

- Use converted files in CreatorOps
- Send to Library
- Add to Export Pack

V2:

- Project-based presets
- Brand presets
- Saved export profiles
- Batch prepare for campaign
- Prepare assets for a content sequence

Important rule:

```txt
Converter works standalone.
CreatorOps can optionally consume the result.
```

The converter should not require CreatorOps project data to operate.

## 17. Reuse Strategy

Reuse strategy:

```txt
CreatorOps = first shell
Media Converter = reusable engine/module
```

Future targets:

- CreatorOps tool
- PBS print-oriented version
- Standalone SaaS
- Desktop/local app
- Other Brenychstudio products

A standalone SaaS should come only after CreatorOps usage proves value.

## 18. Risks and Mitigations

Risks and mitigations:

- Browser memory issues -> file size limits, queue concurrency, clear object URLs.
- Format support differences -> capability detection, fallback formats.
- AVIF/TIFF complexity -> phase after JPG/PNG/WebP.
- User confusion -> task-based presets, collapsed advanced settings.
- Reuse risk -> separate engine, adapters, and presets.
- Direct folder saving unreliable -> ZIP first, folder save later.
- Too generic -> keep CreatorOps presets and workflow context.

## 19. Recommended Implementation Phases

Recommended phases:

- Phase 1 - Module foundation
- Phase 2 - Browser engine MVP
- Phase 3 - Worker queue
- Phase 4 - ZIP export
- Phase 5 - CreatorOps polish
- Phase 6 - Advanced formats
- Phase 7 - Integration hooks

Implementation should start with structure, contracts, and a calm page stub before adding heavy conversion logic.

## 20. Next Task

Final recommendation:

```md
Proceed with Media Converter inside CreatorOps as a local-first, reusable module.
```

Next implementation task:

```txt
Task 24 - Media Tools Navigation + Media Converter Page Stub
```
