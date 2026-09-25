# NER-Vision AI — Multi-Language (i18n) Status & Review Tracker

This document tracks the translation and validation status of all 12 supported regional and national languages across the North Eastern Region of India (MDoNER / SIH26002).

## Language Support Overview

| # | Language | Code | Native Name | Script | Group | Status | Review / Completion Action |
|---|---|---|---|---|---|---|---|
| 1 | **English** | `en` | English | Latin | Base | **Complete** | Primary source reference |
| 2 | **Hindi** | `hi` | हिन्दी | Devanagari | Group A | **Draft MT** | Needs native speaker review |
| 3 | **Assamese** | `as` | অসমীয়া | Bengali / Assamese | Group A | **Draft MT** | Needs native speaker review |
| 4 | **Manipuri (Meitei)** | `mni` | মৈতৈলোন্ (মণিপুরী) | Bengali | Group A | **Draft MT** | Needs native speaker review (Bengali script) |
| 5 | **Mizo** | `lus` | Mizo ṭawng | Latin | Group A | **Draft MT** | Needs native speaker review |
| 6 | **Kokborok** | `trp` | ককবরক | Bengali / Latin | Group A | **Draft MT** | Needs native speaker review |
| 7 | **Khasi** | `kha` | Ka Ktien Khasi | Latin | Group A | **Draft MT** | Needs native speaker review |
| 8 | **Bodo** | `brx` | बर' | Devanagari | Group A | **Draft MT** | Needs native speaker review |
| 9 | **Nepali** | `ne` | नेपाली | Devanagari | Group A | **Draft MT** | Needs native speaker review |
| 10 | **Garo** | `grt` | A·chik | Latin | Group B | **Placeholder** | **Requires manual translation from scratch by native speakers** |
| 11 | **Nyishi** | `njz` | Nyishi | Latin | Group B | **Placeholder** | **Requires manual translation from scratch by native speakers** |
| 12 | **Adi** | `adi` | Adi | Latin | Group B | **Placeholder** | **Requires manual translation from scratch by native speakers** |

---

## Strategy & Policy

### Group A (Machine-Translatable Draft OK)
- **Languages:** Hindi (`hi`), Assamese (`as`), Manipuri/Meitei (`mni`), Mizo (`lus`), Kokborok (`trp`), Khasi (`kha`), Bodo (`brx`), Nepali (`ne`).
- **Policy:** Initial drafts have been generated using automated translation pipelines adapted for regional terminology (e.g. landslides, corridors, flash floods, relief supplies). Because machine translation nuances and dialect variations exist across districts, these files are marked with `"status": "draft_machine_translation"` and **must undergo native speaker verification** before government deployment.

### Group B (No Reliable Machine Translation Exists)
- **Languages:** Garo (`grt`), Nyishi (`njz`), Adi (`adi`).
- **Policy:** No reliable public neural machine translation models exist for these indigenous languages of Meghalaya and Arunachal Pradesh. Fabricating synthetic translations for mission-critical logistics and emergency systems is strictly prohibited. Consequently, their JSON files in `/public/locales/` contain the structured keys with English placeholder text and metadata flagging `"status": "placeholder_untranslated"`. When a user selects these languages, the app cleanly displays the placeholder text and alerts the operator that native speaker translation is in progress.

---

## How Translators Can Contribute

1. Navigate to `public/locales/{lng}/common.json`.
2. Inspect the keys under `nav`, `header`, `dashboard`, `briefing`, `map`, `routes`, `risk`, `vehicles`, `deliveries`, `incidents`, `alerts`, `analytics`, `emergency`, `assistant`, and `field`.
3. Provide culturally appropriate, accurate terms for terrain, landslides, roadblocks, and emergency dispatches.
4. Once verified by a certified linguist or native officer, update `_metadata.status` to `"verified"`.
