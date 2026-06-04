# Device Presentation System

Device Presentation System is a reusable front-end presentation layer for placing real product UI screenshots inside premium device frames. It is intentionally UI-only: no backend, no store, no router, and no product data imports.

## Current Scope

- `src/systems/device-presentation/` owns neutral frames, screen slots, presets, and CSS.
- Product-specific copy and assets live in feature adapters, such as `src/features/creatorops/CreatorOpsDeviceShowcase.tsx`.
- CSS uses the `bs-device-*` prefix so the module can move without colliding with product styles.

## Extraction Path

When the system becomes shared across projects, move the folder to:

```txt
packages/device-presentation
```

The package should expose the same public API from `index.ts`, carry `device-presentation.css`, and keep product adapters outside the package. Product apps should pass `screenSrc`, `screenAlt`, companion assets, and preset choices as props.

## Guardrails

- Screen content must be a real UI screenshot or intentionally prepared product capture.
- Device shells are CSS/markup, not generated device photos.
- `ScreenSlot` controls `fit`, `tone`, and `position` without knowing the product.
- Motion must stay subtle and respect `prefers-reduced-motion`.
