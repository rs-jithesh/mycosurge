# Mycosurge — Icon Prompts (Gemini)

Copy-paste prompts for every icon in `apps/web/src/lib/content/icons.ts`. Each prompt already has
the shared style suffix appended, so one block = one generation.

Paste a block into [Google AI Studio](https://aistudio.google.com) (image model, aspect **1:1**),
then save the PNG into `apps/web/static/assets/icons/` under the filename in the heading.

## Shared settings

| Setting      | Value                                       |
| ------------ | ------------------------------------------- |
| Model        | `gemini-3.1-flash-image` (Nano Banana 2)    |
| Aspect ratio | `1:1`                                       |
| Image size   | `1K` (bump to `2K` if you want more detail) |
| Response     | image only                                  |

Generate `water` first, then keep the same model + suffix for every other icon — only the subject
phrase changes. If one drifts, attach the approved `water.png` as a **reference image** in AI
Studio and ask it to match the style.

## Things to avoid

Gemini has no separate negative-prompt field; the prompts already end with `no text` and
`simple bold silhouette`. If an icon comes out busy, add: `plain background, single centered
object, no text or watermark, no photorealism`.

---

## Tier 0 — Resources & currency

### water — cyan `#68d6e3` → `water.png`

```
game icon, a single glossy water droplet, flat vector, thick clean outline, bio-luminescent cyan (#68d6e3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### nutrients — violet `#b9a7ff` → `nutrients.png`

```
game icon, a cluster of violet nutrient spores around a branching root node, flat vector, thick clean outline, bio-luminescent violet (#b9a7ff) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### biomass — mint `#70fdc3` → `biomass.png`

```
game icon, a dense knot of pale hyphae forming a biomass clump, flat vector, thick clean outline, bio-luminescent mint (#70fdc3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### lysate — amber `#f5c055` → `lysate.png`

```
game icon, a ruptured host cell releasing amber lysate sap, flat vector, thick clean outline, bio-luminescent amber (#f5c055) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### core — mint `#70fdc3` → `core.png`

```
game icon, a radiant fungal nucleus with short radiating hyphae, flat vector, thick clean outline, bio-luminescent mint (#70fdc3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

## Tier 1 — Systems & phases

### radar — cyan `#68d6e3` → `radar.png`

```
game icon, a sonar pulse of concentric rings with a small mushroom antenna, flat vector, thick clean outline, bio-luminescent cyan (#68d6e3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### evolution — mint `#70fdc3` → `evolution.png`

```
game icon, a helix-and-mycelium evolution symbol with an upward arrow, flat vector, thick clean outline, bio-luminescent mint (#70fdc3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### gather — cyan `#68d6e3` → `gather.png`

```
game icon, two droplets and a root tendril drawing water from the substrate, flat vector, thick clean outline, bio-luminescent cyan (#68d6e3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### grow — amber `#f5c055` → `grow.png`

```
game icon, a small mushroom sprouting upward from soil with tiny sparkles, flat vector, thick clean outline, bio-luminescent amber (#f5c055) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### hunt — coral `#ffb4ab` → `hunt.png`

```
game icon, a spore aimed at a small host silhouette, a crosshair made of hyphae, flat vector, thick clean outline, bio-luminescent coral (#ffb4ab) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### expand — mint `#70fdc3` → `expand.png`

```
game icon, a spreading mycelial network radiating outward inside a capacity ring, flat vector, thick clean outline, bio-luminescent mint (#70fdc3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

## Tier 2 — Hosts (portraits)

### soil_nematode — coral `#ffb4ab` → `soil_nematode.png`

```
game icon, a tiny pale soil nematode worm curled in a ball, flat vector, thick clean outline, bio-luminescent coral (#ffb4ab) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### fallen_leaf — mint `#70fdc3` → `fallen_leaf.png`

```
game icon, an autumn leaf veined with glowing mycelium, flat vector, thick clean outline, bio-luminescent mint (#70fdc3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### garden_beetle — amber `#f5c055` → `garden_beetle.png`

```
game icon, a glossy garden beetle with a shiny chitinous shell, top view, flat vector, thick clean outline, bio-luminescent amber (#f5c055) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### field_mouse — coral `#ffb4ab` → `field_mouse.png`

```
game icon, a small field mouse head with warm brown fur and round ears, flat vector, thick clean outline, bio-luminescent coral (#ffb4ab) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### urban_pigeon — cyan `#68d6e3` → `urban_pigeon.png`

```
game icon, an urban pigeon head with an iridescent neck, flat vector, thick clean outline, bio-luminescent cyan (#68d6e3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### stray_cat — amber `#f5c055` → `stray_cat.png`

```
game icon, a stray cat face with sharp amber eyes and a nicked ear, flat vector, thick clean outline, bio-luminescent amber (#f5c055) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### lab_rat — coral `#ffb4ab` → `lab_rat.png`

```
game icon, a laboratory rat head with a small experimental implant, boss aura, flat vector, thick clean outline, bio-luminescent coral (#ffb4ab) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### compost_worm — mint `#70fdc3` → `compost_worm.png`

```
game icon, a segmented compost worm emerging from dark soil, flat vector, thick clean outline, bio-luminescent mint (#70fdc3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### pond_frog — cyan `#68d6e3` → `pond_frog.png`

```
game icon, a pond frog head with wide eyes and wet glistening skin, flat vector, thick clean outline, bio-luminescent cyan (#68d6e3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### backyard_squirrel — amber `#f5c055` → `backyard_squirrel.png`

```
game icon, a backyard squirrel head with a fluffy tail curling behind, flat vector, thick clean outline, bio-luminescent amber (#f5c055) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### feral_raccoon — coral `#ffb4ab` → `feral_raccoon.png`

```
game icon, a feral raccoon face with a black mask and pointed ears, flat vector, thick clean outline, bio-luminescent coral (#ffb4ab) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

<!-- ## Tier 3 — Depth iconography

### osmotic_pump — cyan `#68d6e3` → `osmotic_pump.png`

```
game icon, an osmotic pump drawing water through a membrane, flat vector, thick clean outline, bio-luminescent cyan (#68d6e3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### enzymatic_exudates — violet `#b9a7ff` → `enzymatic_exudates.png`

```
game icon, glowing enzymatic exudate beads forming on a hyphal tip, flat vector, thick clean outline, bio-luminescent violet (#b9a7ff) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### mycelial — mint `#70fdc3` → `mycelial.png`

```
game icon, an emblem of interwoven mycelial threads, flat vector, thick clean outline, bio-luminescent mint (#70fdc3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### incursion — coral `#ffb4ab` → `incursion.png`

```
game icon, a hypha piercing through a host cell wall, flat vector, thick clean outline, bio-luminescent coral (#ffb4ab) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### structural — amber `#f5c055` → `structural.png`

```
game icon, a reinforced chitin structural frame emblem, flat vector, thick clean outline, bio-luminescent amber (#f5c055) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### aggression — coral `#ffb4ab` → `aggression.png`

```
game icon, a sharp spore burst with offensive spikes, flat vector, thick clean outline, bio-luminescent coral (#ffb4ab) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### resilience — mint `#70fdc3` → `resilience.png`

```
game icon, a shielded spore inside an armored membrane, flat vector, thick clean outline, bio-luminescent mint (#70fdc3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

### proliferation — violet `#b9a7ff` → `proliferation.png`

```
game icon, a rapidly branching spore colony multiplying outward, flat vector, thick clean outline, bio-luminescent violet (#b9a7ff) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
``` -->

## Tier 4 — Combat & flourishes

> `spore` is the combat projectile. Generate it on the disc now to lock the style; the
> in-arena version will need a **transparent** cutout (separate pass — see ASSET-PLAN.md).

### spore — mint `#70fdc3` → `spore.png`

```
game icon png with transparent background, a single pill-shaped glowing spore projectile, flat vector, thick clean outline, bio-luminescent mint (#70fdc3) glow, centered on a dark moss-green circular badge (#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology, no text
```

## Extras (no manifest key yet)

### hyphae divider motif — transparent PNG

```
a horizontal border of interwoven glowing hyphae, dark background, flat vector, thick clean outline, bio-luminescent mint (#70fdc3), seamless decorative divider, high contrast, no text
```

### favicon / app mark — mint `#70fdc3`

```
app icon, a stylised fungal nucleus with a glowing mint mycelium ring, flat vector, thick clean outline, bio-luminescent mint (#70fdc3) glow, centered on a dark moss-green rounded square (#161d1b), simple bold silhouette, readable at 32px, no text
```
