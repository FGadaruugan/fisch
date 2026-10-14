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

Branch-based Pages ашигласан ч root HTML нь `web/` дахь dependency-гээ багтаасан runtime-ийг нээнэ. `npm run package` нь `dist/` болон commit хийх `web/` bundle-ийг шинэчилнэ. JavaScript/CSS/HTML өөрчилсний дараа `web/`-ийг хамт commit хийнэ; CI нь энэ bundle эх кодтой тохирч байгааг шалгана.

## Хадгалалт

Local ахиц browser-ийн `localStorage`-д хадгалагдана. Browser data арилгах, private mode, өөр төхөөрөмж ашиглах үед ижил local ахиц баталгаагүй. Storage боломжгүй бол тухайн session-д тоглолт үргэлжилж мэдэгдэл гарна. Гэмтсэн save-ээс зөвшөөрөгдсөн утгуудыг сэргээж, хүчингүй загас/савааг хасна.

## Account, cloud хадгалалт, Top / Friends

Fisch нь хэрэглэгчийн сонгосон **Mini-3Dgame** Supabase project (`ozbcmjcawpnbxfnkvscd`) болон түүний Google Auth-ийг хамт ашиглана. Game data нь зөвхөн `fisch_` хүснэгт/функцэд хадгалагдана. Mini-3Dgame-ийн tables, RPC, triggers, Auth provider тохиргоог өөрчлөхгүй.

1. Одоогийн Local ахицтай **хуучин холбоос, browser дээрээ** Profile → **Google-ээр нэвтрэх** дарна.
2. Mini-3Dgame-д ашигладаг Google account-аа сонгоно. Хоосон Fisch account дээр Local XP, coin, collection болон Backpack-ийн тоотой preview гарна.
3. **Одоогийн ахицаа шилжүүлэх** дарна. Сервер нэг удаа хуулна; эх Local save үлдэнэ. Account аль хэдийн тоглосон/ахицтай бол хуучин save-аар дарж солихгүй.
4. GitHub Pages болон өөр төхөөрөмжөөс ижил Google account-аар нэвтрээд Account аяллаа үргэлжлүүлнэ. Account save нь browser origin-оос тусдаа.

Нэвтрэх popup нь `https://fgadaruugan.github.io/fisch/account.html` руу очно. Энэ нь Mini-3Dgame-ийн Auth Site URL-тай ижил GitHub origin; Supabase ижил origin доторх өөр path руу redirect зөвшөөрдөг. Popup нь `source`, origin болон нэг удаагийн nonce-оо шалгаж зөвхөн эхэлсэн тоглоомын цонх руу session дамжуулна. Google token эсвэл service key дамжуулахгүй; Supabase session-ийг тухайн client Auth.getUser-ээр дахин баталгаажуулна. Callback ажиллах үед browser popup зөвшөөрсөн байх шаардлагатай. Private Site-ийн audience хэвээр үлдэнэ.

Account-аас **Гарах** нь тухайн Fisch browser-ийн session-ээс гаргана. Local аяллын save болон бусад төхөөрөмжийн ахицыг устгахгүй. Сүлжээ тасарвал client баталгаажаагүй reward нэмэхгүй; серверийн revision болон operation receipt нь retry/зэрэг ажиллаж буй цонхны давхар award/spend-ийг хамгаална.

**Top** нь сервер дээр шинээр олсон XP, загасны тоо, жингээр эрэмбэлнэ. Шилжүүлсэн Local ахиц account-ын тоглолт/collection-д үлдэнэ; тэр ахицаас Top оноо үүсгэхгүй. Friends нь Fisch-ийн friend code, request/list/online status-ийг ашиглана; энэ нь shared-world multiplayer биш.

### Backend

`supabase/schema.sql` нь шинэ Fisch namespace-ийн schema. Үүнийг Mini-3Dgame-ийн үндсэн schema файлтай хольж run хийхгүй. Live provisioning нь native migration-тай; shared project дээр anonymous sign-in асаах шаардлагагүй. `fisch-api` нь origin allowlist болон **Auth.getUser JWT verification**-ийг хүсэлт бүрт хэрэгжүүлдэг. Modern Supabase signing keys-д зориулан gateway `verify_jwt=false`; handler нь баталгаажаагүй token-оор database/game command ажиллуулахгүй.

Browser config нь зөвхөн project URL болон `sb_publishable_` key. Service-role/secret key frontend болон `dist/`-д байхгүй. `npm run sync:server` нь browser/server catalogue ба save validation-ийг нэг эхээс гаргана.

Local/PGlite tests нь account transfer, RLS, transactional retry, server-earned Top ба popup source/origin/nonce хамгаалалтыг шалгана. Live database checks нь transaction rollback хийж test progress үлдээхгүй. Browser/GPU болон Google login-ийн бодит төхөөрөмжийн QA энэ build орчинд боломжгүй.

## Кодын бүтэц ба шалгалт

`js/data.js`, `progression.js`, `game-rules.js` — catalogue/XP/үнийн дүрэм; `services/` — local/online API; `fishing.js` — fishing state machine; `terrain.js`, `world.js`, `ocean.js`, `lighting.js`, `models/` — 3D; `app.js` — async lifecycle; `ui/` — DOM panels; `performance.js` — frame pacing/quality. `supabase/` нь сервер, SQL/RLS, transactional receipts.

`npm test` нь өгөгдөл/ахиц/save/input/fishing/app/API/retry болон бодит Postgres engine (PGlite) дахь RLS, transaction, Friends шалгалт ажиллуулна. `npm run check` syntax, import, asset, HTML ID болон browser bundling шалгана. Live Supabase smoke нь тусдаа. Энэ build орчинд browser/GPU rendering болон төхөөрөмжийн бодит FPS шалгагдаагүй.

Dependency хувилбарууд болон lockfile pinned. [Credits](THIRD_PARTY.md). Энэ нь Fisch-ээс санаа авсан өөрийн prototype бөгөөд Roblox/Fisch-ийн албан ёсны бүтээгдэхүүн биш.
