# Fisch Tides · 3D загасчлал

Гурван том аралтай, JavaScript / Three.js дээр хийсэн browser тоглоом. GitHub Pages-д зориулсан static build; PC болон утасны удирдлагатай.

## Тоглоом

- **25 төрөл:** Normal 10 · Rare 8 · Legendary 4 · Mythic 2 · ??? 1. Загас бүр нэр, kg, өөрийн 3D хэлбэр/өнгө, хөдөлгөөнтэй.
- **Palm Bay** эхнээс нээлттэй; **Coral Reach** Lv.3; **Frost Hollow** Lv.5. Арал бүр 330–420 units өргөн, 4000 units далайн орчинтой.
- Саваагаа цэнэглэн шидэж, хазалтыг мэдрээд хөдөлж буй загасыг reel bar дотор барина. Алдсан хазалт, 20 секундийн reel timeout загасыг алдана.
- Backpack 100 slot; rarity filter, kg/value sort; худалдаачны дэргэд нэгээр эсвэл бүгдийг зарах; 3 саваа авах/тоноглох.
- Lobby, Profile, Level/XP, 25 төрлийн collection, арлын аяллын menu. Борлуулсан загас lifetime stats/collection-д үлдэнэ.
- Долгиотой далай, эргийн хөөс, terrain chunks/LOD, instanced мод/чулуу/өвс, сүүдэр, манан, цас, өдөр/шөнийн гэрэл.

## Удирдлага

| Үйлдэл | PC | Утас |
| --- | --- | --- |
| Алхах | WASD / сум | Зүүн joystick |
| Camera | Canvas дээр drag, wheel zoom | Баруун талд drag, pinch zoom |
| Үсрэх | Space | ↑ товч |
| Шидэх / Reel | F дарж барих, суллах | 🎣 дарж барих, суллах |
| Худалдаачин / Ferry | E | Харилцах товч |
| Backpack | B | Backpack товч |
| Цэс хаах | Esc | × товч |

Утсан дээр Play дарахад бүтэн дэлгэц нээх хүсэлт гарна. Дээд талын ⛶ товчоор бүтэн дэлгэц асааж, ↙ эсвэл browser-ийн Back-аар гарна. Заавар доод захад байрлана; joystick болон action товч зааврын дээр байрлана.

Play дарсны дараа тавцангийн үзүүр эсвэл усанд ойр эрэгт очиж загасчилна. Худалдаачин тавцангийн зүүн, Ferry баруун талд байна.

## Graphics ба FPS

Settings → Quality **Auto / Low / Medium / High / Ultra**; FPS cap **30 / 60 / 90 / 120 / 144 / Uncapped**; render scale, харах зай, shadows, fog, particles, exposure, өдрийн цаг, day cycle, volume.

Auto нь үргэлжилсэн ачааллыг хэмжээд чанарыг тохируулна. FPS cap нь зурагдах давтамж; төхөөрөмжийн GPU/дэлгэцийн дээд хязгаарыг өсгөхгүй. HUD нь бодит rendered FPS, CPU frame time, draw calls/triangles харуулна. **RAF Hz** нь browser animation callback-ийн ойролцоо давтамж; дэлгэцийн физик refresh rate гэсэн баталгаа биш. Хөдөлгөөн болон загасчлалын simulation нь rendering cap-аас тусдаа.

## Ажиллуулах

Node.js 22+:

```sh
npm ci
npm test
npm run check
npm run build
npm run dev
```

`http://127.0.0.1:5173` нээнэ. `file://`-оор HTML нээх хэрэггүй. `dist/` нь бүх browser dependency-гээ агуулна; runtime CDN шаардахгүй. `FISCH_PORT=8080 npm run dev` өөр port ашиглана.

## GitHub Pages

Repository **Settings → Pages → Source → GitHub Actions** сонгоно. `main` push эсвэл Actions → **Deploy Fisch Tides** → Run workflow. Workflow нь unit/Postgres tests, syntax/import/assets, static bundle-ийг шалгаад Pages artifact deploy хийнэ. Бүх URL relative тул `/fisch/` subpath дээр ажиллана.

## Хадгалалт

Local ахиц browser-ийн `localStorage`-д хадгалагдана. Browser data арилгах, private mode, өөр төхөөрөмж ашиглах үед ижил local ахиц баталгаагүй. Storage боломжгүй бол тухайн session-д тоглолт үргэлжилж мэдэгдэл гарна. Гэмтсэн save-ээс зөвшөөрөгдсөн утгуудыг сэргээж, хүчингүй загас/савааг хасна.

## Онлайн Top / Friends

**Одоогоор dedicated Fisch backend тохируулагдаагүй.** Local тоглолт бүрэн тусдаа ажиллана. Online button нь хоосон тохиргоонд unavailable төлөв харуулна; хиймэл тоглогч/найз/рейтинг үүсгэхгүй.

Кодод guest identity, серверийн XP/coin/загас, idempotent commands, Top 30 (XP/тоо/жин), өөрийн rank, friend code, хүсэлт илгээх/зөвшөөрөх/татгалзах/цуцлах, найз хасах, 90 секундын online төлөв бэлдсэн. Энэ нь shared-world multiplayer биш. Local ахицыг online ranking руу хуулдаггүй. Online guest identity нь browser session-д хадгалагдана; sign out/data clear/өөр төхөөрөмжөөс сэргээх баталгаа байхгүй.

Сервер загас/reward-ийг сонгож, хамгийн бага загасчлах хугацааг хянадаг. Reel input-ийн сервер replay нь энэ хувилбарын scope-д ороогүй; автомат client амжилттай outcome илгээх боломжтой тул өрсөлдөөнт ranking-д нэмэлт input verification/anti-bot ажил шаардлагатай.

Dedicated Supabase project-ийг эзэмшигчийн сонгосон organization болон үнийг баталгаажуулсны дараа үүсгэнэ. Бусад тоглоомын project-д энэ schema-г бүү ажиллуул.

1. Supabase Dashboard → Authentication → Settings → **Allow anonymous sign-ins** асаана.
2. Dedicated project-ийн SQL Editor-д `supabase/schema.sql` ажиллуулна. Энэ нь шинэ schema setup; давтаж run хийх migration биш.
3. Supabase CLI суулгаад `supabase --help`, `supabase functions deploy --help` шалгаж project-доо `fisch-api` deploy хийнэ. Browser JWT шалгах `verify_jwt = true` хэвээр байна; handler нь Auth.getUser-ээр дахин баталгаажуулна. `npm run sync:server` нь browser болон серверийн catalogue/rules-ийг нэг эхээс гаргана.
4. `js/online-config.js`-д **project URL + sb_publishable_ key** оруулна. Service-role/secret key-г browser source-д хэзээ ч хийхгүй. Server runtime нь `SUPABASE_SERVICE_ROLE_KEY` эсвэл server-only `FISCH_SERVICE_KEY` ашиглана. Хүсвэл `FISCH_ALLOWED_ORIGINS` server secret-д deployment origin-уудаа comma-аар тусгаарлана.
5. Auth/Database advisors ажиллуулж, доорх live smoke test-ийг dedicated project дээр ажиллуулна. Harness нь 3 шинэ guest profile үүсгэдэг; token log хийхгүй. Live шалгалтгүйгээр online service ажиллаж байна гэж бүү үз.

```sh
node tests/online-smoke.mjs --phase all
```

URL/key-г `FISCH_SUPABASE_URL`, `FISCH_PUBLISHABLE_KEY` environment variable-аар мөн өгч болно. Schema-ийн хүссэн migration filename-ийг зохиогоогүй; migration history ашиглах бол CLI-ийн `migration new` / `db pull` help-ийг шалган canonical schema-гаас үүсгэнэ.

## Кодын бүтэц ба шалгалт

`js/data.js`, `progression.js`, `game-rules.js` — catalogue/XP/үнийн дүрэм; `services/` — local/online API; `fishing.js` — fishing state machine; `terrain.js`, `world.js`, `ocean.js`, `lighting.js`, `models/` — 3D; `app.js` — async lifecycle; `ui/` — DOM panels; `performance.js` — frame pacing/quality. `supabase/` нь сервер, SQL/RLS, transactional receipts.

`npm test` нь өгөгдөл/ахиц/save/input/fishing/app/API/retry болон бодит Postgres engine (PGlite) дахь RLS, transaction, Friends шалгалт ажиллуулна. `npm run check` syntax, import, asset, HTML ID болон browser bundling шалгана. Live Supabase smoke нь тусдаа. Энэ build орчинд browser/GPU rendering болон төхөөрөмжийн бодит FPS шалгагдаагүй.

Dependency хувилбарууд болон lockfile pinned. [Credits](THIRD_PARTY.md). Энэ нь Fisch-ээс санаа авсан өөрийн prototype бөгөөд Roblox/Fisch-ийн албан ёсны бүтээгдэхүүн биш.
