# DA Training Academy — Smile Gallery Dental Clinic

This is an interactive Thai training course for new dental assistants (ผู้ช่วยทันตแพทย์) at Smile Gallery Dental Clinic (https://www.smilegallery.clinic/). Most learners are new staff with no background.

- It is a demo for clinic executives. The content is ready to try, but a dentist (หมอเอก) must review it before real use.
- The style is cute, in the spirit of hearjot.mfec.dev. It uses the Smile Gallery logo and colors: navy `#002D73` / `#2F368F` and red `#E0232E`.
- It is desktop-first and responsive down to 375px.
- All UI text is in Thai. Reply to the user in Thai.

## The published Artifact

- **URL:** https://claude.ai/artifact/MT3cMZMaxNKW7H5c5jM7dA (private; owner rooneysakan@gmail.com). Version 3 holds all 10 modules.
- **Before you publish from a new machine or conversation**, first call `Artifact action:"read"` with that URL, then publish with `url` set to it. Otherwise you create a new artifact or the publish is refused.
- **Publish call:**
  ```
  file_path: <repo>/index.html
  url: https://claude.ai/artifact/MT3cMZMaxNKW7H5c5jM7dA
  files: {"course.js":"course.js","app.js":"app.js","engines.js":"engines.js","hr.js":"hr.js"}
  ```
  - The `img/*` files are already published. Add them to `files` only when an image is added or changed.
  - Omit `icon` and `capabilities` so the stored declaration carries forward. Passing a non-empty `capabilities` object replaces the whole set.
- **Stored capabilities:**
  - `db`, with these rules:
    - `progress`: read admin, write admin
    - `progress/{self}`: read interact, write interact
    - `signoffs`: read admin, write admin
    - `signoffs/{self}`: read interact, write admin
    - `media`: read view, write admin
  - `user`, `assets` and `downloads`.

## Roles

The page has no login of its own. Identity is the viewer's claude.ai account, and roles come from the artifact's Share permissions.

- **Learner (Contributor):** sees and saves only their own progress in `progress/{userId}`.
- **HR or manager (Editor):** the HR page shows everyone's scores. Editors also enter on-site skill sign-offs in `signoffs/{userId}` and upload media.
- **Signed out, no db, or read-only:** progress is saved to localStorage only, and the page shows "บันทึกในเครื่องนี้". The HR page shows sample data.

A custom login (employee code or LINE) would need a backend. It has not been built.

## Files

| File | What it holds |
|---|---|
| `index.html` | `<title>`, the `<style>` (all CSS and theme tokens), and the markup shell. There is **no** doctype, html, head or body; the Artifact tool adds them at publish time. Scripts load in this order: course.js → app.js → engines.js → hr.js, then `DA.boot()`. |
| `course.js` | `window.COURSE`, which holds all course content. The header comment documents the block types. Edit content here. |
| `app.js` | Router, home page, module and lesson pages, storyboard "video" player (`SB_ART` regex picks the illustration for each shot), tests, progress, db and user connection, and the certificate. |
| `engines.js` | Practice engines: scenario, spot, match, sequence, tray, clock, tooth. |
| `hr.js` | HR dashboard: everyone's scores, sign-offs and CSV export. It falls back to sample data. |
| `img/` | Instrument and tray photos, and `logo-smile-gallery.png`. |
| `scripts/preview.py` | Local preview server; see "Testing" below. |

## Module schema (`COURSE.modules[]`)

```js
{ id:"m01", level:1|2|3, status:"draft"|"planned", source:["clinic","standard"], minutes,
  title, summary,
  lessons:[{ key:"l1", title, video:{ shots:[...] }, blocks:[...] }],   // every lesson has video + a {t:"check"} block
  practice:[{ id:"p1", type:"scenario|spot|match|sequence|tray|clock|tooth", ... }],
  test:[{ q, c:[4 choices], a:<index>, why }],                          // used for both the pre-test and the post-test; passMark 80
  checklist:[ "on-site skill items HR signs off" ] }
```

**The 10 modules.** All are `status:"draft"`, which means the content is written and awaits the dentist's review.

| Level | Module | Title |
|---|---|---|
| 1 | m01 | ปฐมนิเทศ |
| 1 | m02 | ควบคุมการติดเชื้อ |
| 1 | m03 | ระบบเรียกฟัน FDI |
| 1 | m04 | เครื่องมือและการจัดถาด |
| 2 | m05 | Four-handed |
| 2 | m06 | วัสดุทันตกรรม |
| 2 | m07 | งานบริการเฉพาะทาง |
| 3 | m08 | สื่อสารกับคนไข้ |
| 3 | m09 | เหตุฉุกเฉิน |
| 3 | m10 | รังสี/เอกสาร/สต็อก/สั่งซื้อ |

The totals are 40 lessons, 34 practices and 95 test questions.

## Content rules

- `source:"clinic"` means the content comes from the clinic's own documents. `"standard"` means it is compiled from standard sources such as WHO, CDC and ทันตแพทยสภา.
- The clinic's source documents (the Regenerative material price list, the Smile Gallery order form `.xlsx`, and the doctor's schedule) are kept **outside this repo** on purpose. **Never put supplier prices into the course.** Product names and the order-form layout are fine.
- New storyboard captions should match the right `SB_ART` regex in app.js. Watch for accidental matches, such as "น้ำยา" hitting the drop rule.

## Testing

```bash
python scripts/preview.py
```

This builds `.preview/` and serves http://127.0.0.1:8765. In Claude Code, `preview_start {name:"da-preview"}` does the same thing through `.claude/launch.json`. Restart it after edits.

- Use `DA.go({name:'mod', id:'m06', step:'L:l1'|'P:p1'|'pre'|'post'|'check', peek:true})` to jump straight to a step.
- Before publishing, check these:
  - there are no console errors
  - every lesson renders and has video shots and a check
  - answer indices are in range and practice ids are unique
  - there is no horizontal overflow at 375px
