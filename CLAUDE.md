# DA Training Academy — Smile Gallery Dental Clinic

This is an interactive Thai training course for new dental assistants (ผู้ช่วยทันตแพทย์) at Smile Gallery Dental Clinic (https://www.smilegallery.clinic/). Most learners are new staff with no background.

- It is a demo for clinic executives. The content is ready to try, but one of the clinic's dentists must review it before real use. (Don't name a specific dentist; nobody has been named yet.)
- The style is cute, in the spirit of hearjot.mfec.dev. It uses the Smile Gallery logo and colors: navy `#002D73` / `#2F368F` and red `#E0232E`.
- It is desktop-first and responsive down to 375px.
- All UI text is in Thai. Reply to the user in Thai.

## The published Artifact

- **URL:** https://claude.ai/artifact/MT3cMZMaxNKW7H5c5jM7dA (owner rooneysakan@gmail.com; shared as "Anyone with the link" as of version 5). Version 4 holds all 10 modules and the DENTA mascot. Version 5 adds the certificate, DENTA reactions and the results banner. Version 6 adds the daily refresher (`daily.js`). Version 7 adds the skills map (`skills.js`).
- **Before you publish from a new machine or conversation**, first call `Artifact action:"read"` with that URL, then publish with `url` set to it. Otherwise you create a new artifact or the publish is refused.
- **Publish call:**
  ```
  file_path: <repo>/index.html
  url: https://claude.ai/artifact/MT3cMZMaxNKW7H5c5jM7dA
  files: {"course.js":"course.js","app.js":"app.js","engines.js":"engines.js","hr.js":"hr.js","skills.js":"skills.js","daily.js":"daily.js"}
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

## The web version (Firebase)

- **URL:** https://smilegallerytraining.web.app, from Firebase project `smilegallerytraining` (Spark plan, free). The CLI is logged in as the clinic account that owns the project.
- It wraps the same `index.html` and scripts with `web/auth.js` and `web/auth.css`, which add sign-in (Google or email and password; the user enabled both providers in the Console on 2026-11-07, and both auth.js `viaAllowed` and the rules `signedIn()` reject any other provider), registration, HR approval and user management. The Artifact keeps working unchanged. app.js and hr.js only reach the web layer through `DA.platform` and similar guards.
- **Build and deploy:** `python scripts/build_web.py`, then `cd dist-web && firebase deploy` (`--only hosting` for content-only changes). For a local demo with fake Firebase: `preview_start {name:"da-web-fake"}` (port 8766, `?reset=1&as=admin|hr|learner|pending|new|google`; sample accounts use the password `test1234`, and `google` is a new Google account that has not registered yet; the Google button opens a fake account chooser).
- Google sign-in uses `signInWithPopup` with `prompt: 'select_account'`. Google accounts are e-mail-verified, so an admin gmail becomes admin right after registering. LINE, Facebook and Instagram in-app browsers block Google OAuth, so auth.js shows a hint there (`IN_APP`) and email/password stays available. Closing the popup shows no error (`SILENT`).
- `web/site.json` is gitignored. It holds the Firebase web config and the `admins` e-mails; keep the spelling "smilegallary…" exactly. The served page gets only SHA-256 hashes of those e-mails. The real list goes into `dist-web/firestore.rules`.
- Registration asks for ชื่อ-นามสกุล, **รหัสพนักงาน** and สาขา. The employee code is required for staff (auth.js, the rules and the fake all check it) and optional for admin e-mails. auth.js normalizes it to upper case with no spaces (`normEmp`). HR sees it under the name on the score overview, can search by it, sees it on the person page and as the first CSV column, and the users table flags duplicates with "รหัสซ้ำ". hr.js shows these only when `DA.platform` is set, so the Artifact is unchanged.
- The first admin either presses "เข้าสู่ระบบด้วย Google" with the admin gmail and registers (code may be blank), which makes them admin at once, or signs up with the admin e-mail and a password, registers, presses "ส่งลิงก์ยืนยันอีเมล", opens the link, then "ยืนยันแล้ว"; the rules then let them promote themselves to admin.
- The Firestore `(default)` database is in `asia-southeast1` (Singapore). It was moved from `nam5` on 2026-11-07 while still empty. `build_web.py` writes `"location": "asia-southeast1"` into `dist-web/firebase.json`, because `firebase deploy` would otherwise create a missing database in `nam5`. A location can't be changed later; moving means deleting the database and recreating it, and Firebase blocks reusing the `(default)` ID for about 5 minutes after a delete.
- Security lives in `web/firestore.rules`. The Thai maintenance guide is `web/README.md`.

## Roles

The page has no login of its own. Identity is the viewer's claude.ai account, and roles come from the artifact's Share permissions.

- **Learner (Contributor):** sees and saves only their own progress in `progress/{userId}`.
- **HR or manager (Editor):** the HR page shows everyone's scores. Editors also enter on-site skill sign-offs in `signoffs/{userId}` and upload media.
- **Signed out, no db, or read-only:** progress is saved to localStorage only, and the page shows "บันทึกในเครื่องนี้". The HR page shows sample data.

A custom login (employee code or LINE) would need a backend. It has not been built.

## Files

| File | What it holds |
|---|---|
| `index.html` | `<title>`, the `<style>` (all CSS and theme tokens), and the markup shell. There is **no** doctype, html, head or body; the Artifact tool adds them at publish time. Scripts load in this order: course.js → app.js → engines.js → hr.js → skills.js → daily.js, then `DA.boot()`. |
| `course.js` | `window.COURSE`, which holds all course content. The header comment documents the block types. Edit content here. |
| `app.js` | Router, home page, module and lesson pages, storyboard "video" player (`SB_ART` regex picks the illustration for each shot), tests, progress, db and user connection, and the certificate. The certificate route is `{name:'cert'}`: `renderCert` and `drawCert` draw a 1754×1240 canvas, and `DA.acts['cert-dl']` saves it as a PNG through `downloads`. The name comes from the profile. Until every module's post-test is passed it shows a "ตัวอย่าง" watermark. `rDenta(say)` puts the DENTA reaction on the result cards. |
| `engines.js` | Practice engines: scenario, spot, match, sequence, tray, clock, tooth. |
| `hr.js` | HR page: everyone's scores, sign-offs and CSV export. It falls back to sample data. The route is `{name:'hr'}` with `view:'dash'` (default) or `view:'map'`, and the header tabs (`data-act="hr-view"`) switch between the score overview and the skills map. It exports `DA.hr.api` (`filtered`, `rowsOf`, `branchOf`, `nameOf`, `ST`, `wireTips`, `redraw`, `setBranch` and more) for skills.js. |
| `skills.js` | Skills map: see "Skills map" below. It exports `DA.skills`; hr.js and app.js call it only through `if (DA.skills)` guards. |
| `daily.js` | Daily refresher (route `{name:'daily'}`, nav "ทบทวนรายวัน"): 5 questions a day by spaced repetition, plus a streak. See "Daily refresher" below. It exports `DA.daily`; app.js calls it only through `if (DA.daily)` guards, so the course still works without the file. |
| `img/` | Instrument and tray photos, `logo-smile-gallery.png`, and `denta.png`. `denta.png` is the clinic mascot น้องเดนต้า, used on the home hero and in the video intro/outro (`MASCOT` in app.js). It was cut from a 1028×257 banner, so it is only about 179×256 px; swap in a larger PNG with a transparent background if the clinic has one. |
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

## Daily refresher (`daily.js`)

- **Pool:** 129 questions, built at load time from every draft module's `test` (95) and lesson `check` blocks (34). Question ids are `<moduleId>_<hash of q + img>`, so editing a question's text gives it a new id and a fresh schedule. Two m04 image questions share the same text, which is why the image is part of the key.
- **Schedule (Leitner boxes, `IV=[0,1,2,4,7,14]` days per box):**
  - A first correct answer puts a question in box 2, due in 2 days.
  - A correct answer on or after the due day moves it up one box, to a maximum of box 5 (14 days). Answering before the due day does not move it.
  - A wrong answer puts it back in box 1, due tomorrow.
  - Box 3 or higher (4 days or more) counts as "จำแม่น".
- **Each day's set (5 questions):**
  - due questions first, lowest box first
  - then new questions, taken in turn from the modules the learner has started (from all modules if none is started, or in presenter mode)
  - then early review of the questions closest to due
  - After the set, "ทบทวนเพิ่มอีก 5 ข้อ" deals a bonus round that does not repeat the main set.
- **Seeding:** every module post-test calls `DA.daily.seed(m, log)`. Correct answers are graded as above. Wrong answers are due today, and if today's set hasn't started it is rebuilt to include them.
- **Storage:** `progress/{userId}.review`, in the same document as the rest of progress, merged by `cleanProg`/`mergeProg` in app.js:
  ```js
  review = { q:{id:{b,due,n,w,at}}, streak:{n,best,last}, today:{d,ids,res,round,done}, hist:[{d,r,n,ok}] }
  ```
  Opening the page never writes anything. The first write happens on the first answer. `merge` joins streak runs from two devices.
- Home has a "ทบทวนรายวันกับน้องเดนต้า" button, the results page has a streak strip, and the nav shows a red dot until today's set is done.

## Skills map (`skills.js`)

- **Where it appears:**
  - It is the "แผนที่ทักษะ" tab on the HR page (`DA.go({name:'hr', view:'map'})`).
  - The home page shows a teaser section for managers ("เห็นทักษะของทีมทั้งคลินิก ในหน้าเดียว"), with a mini heatmap built from sample data and a button (`sk-open`) that opens the map.
- **Cell status** comes from `modStatus` in app.js:
  - `done` ผ่านสมบูรณ์: the post-test is passed and every checklist item is signed off.
  - `wait` รอประเมินหน้างาน: the post-test is passed, but sign-offs are incomplete.
  - `prog` กำลังเรียน: the cell shows the % progress.
  - `none` ยังไม่เริ่ม.
- **รายคน (people) view:**
  - It is a learners × 10 modules table, grouped by branch, with a sticky name column.
  - The legend buttons (`sk-focus`) highlight one status.
  - A cell or a name opens the person page, whose back button returns to the map.
  - The footer row shows the % "ผ่านสมบูรณ์" per module.
- **รายสาขา (branch) view:** a branches × modules heatmap of % ผ่านสมบูรณ์, with a 5-step navy ramp (`--sk-h0`…`--sk-h4`). Clicking a branch (`sk-branch`) filters to that branch in people view.
- **Three insight cards on top:**
  - the readiest module
  - the module to push
  - pending on-site sign-offs, with "ไฮไลต์ในตาราง"
- **CSS gotchas:**
  - `.sk th,.sk td{background:none}` outranks single-class rules, so status fills use `.skc.k-*`.
  - `.mt` is already taken by the match engine, so module header titles use `.sk-mt`.
  - `.sk-scroll` must stay `position:relative`. Otherwise the absolutely positioned `.sr` text in each cell escapes the scroll box and widens the page at 375px.

## Content rules

- `source:"clinic"` means the content comes from the clinic's own documents. `"standard"` means it is compiled from standard sources such as WHO, CDC and ทันตแพทยสภา.
- The clinic's source documents (the Regenerative material price list, the Smile Gallery order form `.xlsx`, and the doctor's schedule) are kept **outside this repo** on purpose. **Never put supplier prices into the course.** Product names and the order-form layout are fine.
- New storyboard captions should match the right `SB_ART` regex in app.js. Watch for accidental matches, such as "น้ำยา" hitting the drop rule.

## Testing

```bash
python scripts/preview.py
```

This builds `.preview/` and serves http://127.0.0.1:8765. In Claude Code, `preview_start {name:"da-preview"}` does the same thing through `.claude/launch.json`. Restart it after edits.

- Use `DA.go({name:'mod', id:'m06', step:'L:l1'|'P:p1'|'pre'|'post'|'check', peek:true})` to jump straight to a step. `DA.go({name:'daily'})` opens the daily refresher, and `DA.go({name:'hr', view:'map'})` opens the skills map.
- The browser caches the scripts. After a restart, run `await Promise.all(['app.js','daily.js','course.js','engines.js','hr.js','skills.js'].map(f=>fetch('/'+f,{cache:'reload'})))` and then reload.
- Before publishing, check these:
  - there are no console errors
  - every lesson renders and has video shots and a check
  - answer indices are in range and practice ids are unique
  - there is no horizontal overflow at 375px
