# Imagery and posters: visual review

The scanner reads code, not pixels. Posters, hero images, banners and product
shots made by an image model need a different pass: look at the image, score it
against tells 36–42, and propose a fix. This file is that pass.

Use it when the project contains generated or AI-looking images, when someone
shares a poster, flyer, hero or ad and asks why it looks machine-made, or when
`scan.mjs` reports tell 40 (generated-image file names).

## How to review an image

1. **Look first, list second.** Name what the piece is for in one sentence
   (sell phones, announce an event). If you cannot, that is already tell 40.
2. **Find the one thing the viewer should read first.** Then check whether the
   design agrees. On slop, everything is equally loud and nothing is first.
3. **Walk the checklist below.** Record each hit as: what you see, where, which
   tell, and the one-line fix.
4. **Judge the finish, not the wording.** This pass is about how the image looks
   (texture, space, axis, light), not about its copy or facts. Mention a factual
   problem only if it is plainly visible, such as a garbled brand mark.
5. **Report before redoing.** Give the grouped list, then ask whether to
   rebuild it (see "Rebuilding") or leave the image alone.

## Checklist

| Tell | What to look for | Fix |
| --- | --- | --- |
| 36 Torn-paint banner | A brush-stroke or torn-edge colour block behind the offer or the contact line, the same shape reused | A solid bar, or no bar; one shaped block at most |
| 37 Glow, gloss, reflection | Dark ground, saturated colour, a halo behind the product, a mirror floor, gradients plus shadows everywhere | One calm ground, one accent, one contact shadow |
| 38 Three-typeface pile-up | A condensed heavy, a slanted italic and a script on one sheet | One family, two or three weights |
| 39 Identical icon circles | A row of same-size coloured circles, each with a glyph and a stock phrase | One or two specific promises as plain text |
| 40 Airbrushed finish | No grain, paper, print slip or wear anywhere; flat areas and gradients perfectly clean | Put the texture back: print and rescan, real paper grain, colour layers a little off |
| 41 No quiet space | Every corner filled, every region finished to the same level, no first read | Remove a third of the elements; leave one large area empty |
| 42 Dead-centre symmetry | Headline, product and tagline on one axis; left and right nearly mirror each other | Move the main element off the axis; balance with space, not a mirror |

One further signal is worth noting even though it has no tell number:

- **Symbol padding.** Decorative extras with no job: a globe beside a URL, a
  cursor-click glyph, a phone icon beside a phone number.

## Say less (the information budget)

Generated posters usually carry too much: a logo, three slogans, five claims,
a badge row, two contact lines. Count the separate messages. A poster should
carry **one**. Keep:

1. One headline (the one thing the viewer should read first).
2. One supporting line, or none.
3. One contact, the second-largest thing on the sheet.
4. Optionally one real photograph.

Everything else is a candidate to delete, not to restyle. The site's **Rebuild
with less** panel enforces this on purpose: three short text fields, one
typeface, one accent colour, set off-centre with a large empty area.

## Rebuilding

Prefer a rebuild in HTML/CSS or the project's design tool over a new
generation. Write a layout with: one typeface, a plain ground, one accent,
one clear first read (usually the offer, then the contact), real photographs
and real facts. A poster that is mostly type, set well, beats a polished
generated one. Do not generate a replacement with the same model and hope.

## Prompt-side playbook (when an image model is still the right tool)

- Ask for one subject on a plain ground; no glow, no reflection, no gradient
  background, no decorative banners, and an off-centre composition with a
  large empty area.
- Ask for visible grain and slight print imperfection, then check it is there.
- Ask for **no text** in the image and set the type yourself. Models mangle
  small text, prices and logos.
- Never ask for a named brand's device or logo. Use your own photo.
- Say what to leave empty: "large areas of plain background".
- Judge the output against the checklist; regenerate only for a specific fault.

## Trust and legal notes

- If an image is generated, say so where the project's norms or local rules
  require it. Do not strip metadata to hide it.
- Distorted or invented third-party marks are a trademark risk. Recommend
  removal, not a cleaner fake.

## False positives

A single dark, red-accented poster is not automatically slop. A brush stroke
that a designer drew for this brand, a typeface pairing with a reason, a
product photo of the real unit with a soft shadow: all fine. Flag defaults that
nobody chose, and confirm with the author when unsure.
