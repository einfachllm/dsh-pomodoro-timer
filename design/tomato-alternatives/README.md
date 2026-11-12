# Tomato artwork alternatives

Design exploration for the pomodoro pill icon (14 px in the composer dock, 64 px in the
plugin catalog). Six directions, all on the same `0 0 64 64` canvas as the shipped
`icon.svg`, so any of them can replace it 1:1.

Open **`gallery.html`** in a browser (or `gallery-light.html` for the light theme) to see
each one at 104 / 56 / 32 / 20 / 14 px, on light and dark surfaces, and inside a mock of
the real composer pill. `preview-dark.png` / `preview-light.png` are static snapshots.

| # | File | Character | Notes |
|---|---|---|---|
| 01 | `01-classic-gloss.svg` | Polished sphere, soft specular highlight, lush two-layer calyx | Safe premium upgrade, holds up at 14 px |
| 02 | `02-timer-face.svg` | Tomato body becomes a cream clock dial with ticks and hands | Most on-message, but reads as "clock" more than "tomato" at 14 px |
| 03 | `03-neon-glass.svg` | Glowing gradient, glass sheen, aura, sparkle | Built for the dark UI; loses detail small |
| 04 | `04-sticker.svg` | Glossy tomato with white die-cut rim + soft shadow | Reads on any background; the rim is bold at 14 px |
| 05 | `05-geometric-flat.svg` | Hard-edged flat shapes, crescent shade, star calyx | Crispest tiny silhouette, poster-like |
| 06 | `06-kawaii.svg` | Blush, eyes, smile | Charming at dialog size, mushy below ~20 px |

## Applying a pick

1. Copy the chosen SVG over `../../icon.svg`.
2. Replace the inline `TomatoIcon` in `../../client.js` with the same artwork — the
   component already lives in a 16-unit viewBox drawn at 14 px, so either keep the
   64-unit viewBox (CSS sets the size) or scale the coordinates by 1/4.
3. Regenerate the catalog icon in `../../index.json`:

   ```sh
   printf 'data:image/svg+xml;base64,%s' "$(base64 -w0 ../../icon.svg)"
   ```

`build-gallery.mjs` regenerates both gallery pages after edits to the SVGs or the variant
list: `node build-gallery.mjs`.
