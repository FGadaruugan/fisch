# Fisch 3D — 25 загас, 3 арал, Backpack ба Lobby
Огноо: 2026-10-14
Репо: https://github.com/FGadaruugan/fisch
Төлөв: хэрэглэгчийн нэмсэн шаардлагаар шинэчилсэн загвар; код хэрэгжүүлэхээс өмнөх review.

## Зорилго ба хэрэглэгчийн шаардлага
GitHub дээр Fisch-ээс санаа авсан шинэ 3D тоглоом бүтээнэ. Browser дээр PC болон утсаар тоглох HTML/CSS/JavaScript хувилбар санал болгосон.

Хэрэглэгчийн шинэ шаардлага:
- Normal 10, Rare 8, Legendary 4, Mythic 2, `???` 1 — нийт 25 өөр төрлийн загас.
- Загас бүрийн нэр болон кг харагдана.
- Backpack байна.
- Гурван арал байна.
- Lobby-д Top, Profile, Level, Friends байна.

10/8/4/2/1 нь төрлийн тоо; барих магадлалын хувь биш. Дээрх нь өмнөх найман загас, нэг арлын саналын оронд хэрэгжинэ.

Амжилтын шалгуур: lobby-оос 3D ертөнцөд орж, дүрээ хөдөлгөн, загас барьж, Backpack-оос нэр/кг-г харж, загасаа зарж, саваагаа сайжруулан, XP/level авч, гурван аралд шилжинэ. Profile нь ахиц болон рекордыг харуулна. Онлайн lobby ажиллах үед бодит тоглогчдын Top болон найзын хүсэлтийг ашиглана.

## Хэрэгжүүлэх хэсгүүд ба хандлага
Санал болгож буй платформ нь Three.js бүхий статик browser client, GitHub Pages байршуулалт. Roblox Studio хувилбарт GitHub нь Luau код хадгалах үүрэгтэй; Godot хувилбарт engine төсөл болон web export хэрэгтэй болно. Одоогийн загвар browser client-д зориулагдсан.

Ажлыг хоёр дараалсан хэсгээр зохион байгуулна:
1. **3D тоглоом ба үндсэн lobby:** ертөнц, загасчлал, 25 загас, Backpack, shop, profile, XP/level, гурван арал, local save.
2. **Онлайн lobby:** серверийн identity/profile, бодит Top, friend request/list, online status, серверийн ахиц хадгалалт.

Хэсэг бүр тусдаа хэрэгжүүлэх, шалгах төлөвлөгөөтэй байна. Онлайн үйлчилгээгүй үед local тоглоом ажиллаж, Top/Friends нь “Онлайн үйлчилгээ холбогдоогүй” гэсэн бодит төлөв харуулна. Жишээ тоглогчдыг бодит ranking эсвэл найз мэт харуулахгүй.

Friends-ийн одоогийн санал нь найз нэмэх, хүсэлт зөвшөөрөх/цуцлах, жагсаалт болон online status. Найзтайгаа нэг 3D ертөнцөд хамт тоглох нь shared-world multiplayer хэсэг бөгөөд сонговол lobby-гийн дараагийн тусдаа загвар болно.

## 25 төрлийн загас
Доорх нэр болон жингийн хүрээ нь тоглоомын санал болгосон data; амьтдын бодит биологийн жингийн лавлагаа биш. Бүх төрлийг нэр, жингийн хүрээ, ховор байдал, арал, суурь үнээр нэг data module-д тодорхойлно.

| Ангилал | Төрлийн тоо | Суурь сонголтын жин | XP / catch | Coin / кг |
| --- | ---: | ---: | ---: | ---: |
| Normal | 10 | 68 | 12 | 12 |
| Rare | 8 | 25 | 32 | 28 |
| Legendary | 4 | 6 | 80 | 45 |
| Mythic | 2 | 0.9 | 180 | 80 |
| ??? | 1 | 0.1 | 400 | 150 |
| **Нийт** | **25** | **100** | — | — |

Сонгосон аралд байхгүй ангиллыг хасаад үлдсэн жинг normalize хийнэ. Тухайн ангиллын төрлүүдээс ижил магадлалаар нэгийг сонгоно. Жин нь тухайн төрлийн min/max хүрээнд санамсаргүй байна. Үнэ нь kg × ангиллын Coin/кг, бүхэл coin руу тоймлосон, хамгийн багадаа 1 coin байна.

| ID | Name | Ангилал | Тоглоомын кг хүрээ | Арал |
| --- | --- | --- | ---: | --- |
| n01 | Silver Minnow | Normal | 0.10–0.45 | Palm Bay |
| n02 | River Perch | Normal | 0.30–1.40 | Palm Bay |
| n03 | Blue Sardine | Normal | 0.10–0.60 | Palm Bay |
| n04 | Reef Bass | Normal | 1.00–4.00 | Coral Reef |
| n05 | Coral Bream | Normal | 0.50–3.00 | Coral Reef |
| n06 | Red Snapper | Normal | 1.00–6.00 | Coral Reef |
| n07 | Ice Herring | Normal | 0.20–1.00 | Frostpeak |
| n08 | Snow Trout | Normal | 0.80–4.00 | Frostpeak |
| n09 | Arctic Cod | Normal | 1.00–8.00 | Frostpeak |
| n10 | White Mackerel | Normal | 0.50–3.00 | Frostpeak |
| r01 | Golden Carp | Rare | 1.50–8.00 | Palm Bay |
| r02 | Moon Trout | Rare | 1.00–5.00 | Palm Bay |
| r03 | Emerald Koi | Rare | 0.70–3.50 | Palm Bay |
| r04 | Ruby Grouper | Rare | 3.00–15.00 | Coral Reef |
| r05 | Flame Eel | Rare | 1.00–7.00 | Coral Reef |
| r06 | Sunscale Pike | Rare | 2.00–12.00 | Coral Reef |
| r07 | Crystal Salmon | Rare | 3.00–18.00 | Frostpeak |
| r08 | Aurora Tuna | Rare | 5.00–25.00 | Frostpeak |
| l01 | Crown Marlin | Legendary | 15.00–70.00 | Palm Bay |
| l02 | Sunfin Swordfish | Legendary | 20.00–90.00 | Coral Reef |
| l03 | Glacier Shark | Legendary | 40.00–180.00 | Frostpeak |
| l04 | Starlight Ray | Legendary | 10.00–60.00 | Frostpeak |
| m01 | Phoenix Ray | Mythic | 25.00–120.00 | Coral Reef |
| m02 | Frost Leviathan | Mythic | 80.00–400.00 | Frostpeak |
| u01 | Abyssal Sovereign | ??? | 150.00–1000.00 | Frostpeak |

`???` ангиллын загасны жинхэнэ нэр collection-д анх барих хүртэл нууц байна. Барьсны дараа catch result, Backpack болон Profile рекордод нэр нь харагдана.

## Гурван арал ба хөдөлгөөн
| Арал | Орчин | Төрлийн тоо | Нээгдэх нөхцөл |
| --- | --- | ---: | --- |
| Palm Bay | Ногоон арал, элс, модон тавцан | 7 | Lv.1, эхнээс нээлттэй |
| Coral Reef | Шүрэн эрэг, улаан чулуу, гүн ус | 8 | Lv.3 |
| Frostpeak | Мөсөн эрэг, цас, хөх ус | 10 | Lv.5 |

Арал бүр худалдаачин, ferry interaction, загасчлах бүстэй. Нэг идэвхтэй аралд дүрээ гуравдагч этгээдийн камераар удирдана. Арал шилжихэд fishing төлөвийг цэвэрлэж, дэлгэцийн богино transition хийж, шинэ арлын spawn дээр байрлуулна. Нээгдээгүй арлын нэр болон шаардлагатай level нь map/menu-д харагдана.

Low-poly геометр, дахин ашиглах материал, pixel ratio-ийн хязгаар ашиглаж утасны ачааллыг багасгана. Идэвхгүй арлын mesh-үүдийг render хийхгүй. Ус, тэнгэр, гэрэлтүүлэг, манан нь орчны ялгааг гаргана. Дүр ус руу нэвт алхахгүй; арал болон тавцангийн хилээр collision хязгаарлана.

## Загасчлах үндсэн цикл
1. Эрэг эсвэл тавцангийн загасчлах бүсэд очно.
2. Action-г дарж барихад хүч цэнэглэгдэж, суллахад шиднэ.
3. Хөвөгч усанд хүрээд 2–5 секунд хүлээнэ.
4. Загас өгөөш авахад 1.8 секундийн дотор Action хийнэ.
5. Reeling мини тоглоомд Action-г дарж/суллан удирдах барыг загасны тэмдэгтэй давхцуулна.
6. Амжилттай бол нэр, кг, rarity, coin value, XP бүхий загас Backpack-д нэг удаа нэмэгдэнэ.

Төлөвүүд: idle → charging → waiting → bite → reeling → caught/escaped → idle.

Reeling ахиц 0.28-аас эхэлнэ. Давхцсан үед секундэд 0.15 нэмэгдэж, давхцаагүй үед 0.10 буурна. 1 хүрвэл catch, 0 хүрвэл escape; 20 секундэд дуусаагүй бол escape. Загасны тэмдэг 0–1 зайд хязгаараас ойж хөдөлнө. Normal/Rare/Legendary/Mythic/`???`-ийн normalized speed нь секундэд 0.20/0.28/0.36/0.44/0.52 байна. Player bar нь Action held үед секундэд 0.55-аар дээш, сул үед 0.35-аар доош хөдөлнө. Эдгээр constants нь ангиллын data-д төвлөрнө.

Cancel, цэс нээх, ferry шилжилт, загасчлах бүсээс гарах үед fishing-ийг цуцална. Tab далд үед simulation болон fishing timer-ууд түр зогсож, held input цэвэрлэгдэнэ. Нэг catch-ийг хоёр удаа олгохгүй.

## Backpack, shop ба саваа
Backpack нь барьсан загас болон эзэмшдэг савааг тусдаа tab-аар харуулна. Загасны нэг card:
**Golden Carp · 3.42 kg · Rare**.

Catch instance бүр unique ID, species ID, жин, барьсан арал болон барьсан огноотой байна. Жинг дотроо бүхэл граммаар хадгалж, UI дээр кг-г хоёр орны нарийвчлалтай харуулна. Ижил нэртэй өөр жинтэй загас тусдаа item байна.

Backpack-д rarity filter, жин/үнээр sort, fish detail байна. Загасны 100 slot; дүүрсэн үед шинээр cast эхлэхгүй, зарах заавар гарна. Тоглогч загасчлах үед саваа солихгүй. Саваа slot нь загасны capacity-д тооцогдохгүй.

Худалдаачны ойролцоо загасаа нэг бүрчлэн эсвэл бүгдийг нь зарна. Борлуулалт inventory-с item-ийг авч coin-ийг нэг удаа нэмнэ. Хоосон Backpack зарахад мөнгө нэмэгдэхгүй.

Саваанууд:
- Starter: үнэгүй, эхнээс тоноглосон; reeling bar width 0.24.
- River: 150 coin; bar width 0.30.
- Ocean: 650 coin; bar width 0.36. Rare/Legendary/Mythic/`???` сонголтын жинг 1.35-аар үржүүлээд normalize хийнэ.

Авсан саваагаа equip хийж болно. Нэг саваа давтан худалдаж авах, эзэмшдэггүй савааг equip хийх, сөрөг coin үүсгэхийг state/service түвшинд хориглоно.

## Level, Profile, Lobby
Catch бүр тухайн rarity-ийн XP-г нэмнэ. Lv.1 нь нийт XP=0; Lv.n-ийн босго нь 100 × (n−1)². Жишээ: Lv.2=100 XP, Lv.3=400 XP, Lv.5=1600 XP. Level bar нь дараагийн level хүртэлх ахицыг харуулна.

Lobby нь тоглоомын үндсэн дэлгэц байна: арлын 3D background, **Play**, **Backpack**, **Top**, **Profile**, **Friends**, **Shop**, **Settings**. Header дээр нэр, аватар, Level/XP, coin байна. Play нь сүүлд байсан нээлттэй аралд оруулна; анхны тоглогч Palm Bay-д орно.

Profile:
- Тоглогчийн нэр болон бэлэн сонголттой аватар.
- Level, нийт XP, coin.
- Нийт барьсан загас, rarity бүрийн catch count.
- Хамгийн хүнд загасны Name/kg, үнэ.
- Нээгдсэн арал болон species collection 0/25.

Загасаа зарсан ч XP, нийт catch count, рекорд, collection алдагдахгүй.

Top нь бодит онлайн өгөгдлийн Top 30. Tab-ууд нь нийт XP, нийт catch count, хамгийн хүнд загас. Өөрийн rank нь list-д багтаагүй ч тусад нь харагдана. Ranking-д нэр, аватар, level болон тухайн tab-ын үзүүлэлт харагдана.

Friends-ийн санал болгосон эхний scope:
- Өөрийн friend code-г харуулах/хуулж авах.
- Friend code-оор хүсэлт илгээх.
- Ирсэн хүсэлтийг зөвшөөрөх/татгалзах.
- Илгээсэн хүсэлтийг цуцлах.
- Найзын жагсаалт, profile summary, online/offline status.
- Найзаас хасах.

Chat болон хамт нэг world-д орох үйлдэл энэ friend-list scope-д орохгүй; shared-world хувилбар сонговол тусдаа room/invite design нэмж бичнэ.

## PC ба утасны удирдлага
PC: WASD/сум — алхах; Space — үсрэх; mouse drag — камер; F/action button — cast/bite/reel үйлдэл; E — ойрын худалдаачин/ferry interaction; B — Backpack; Escape — цэс хаах/загасчлалыг цуцлах.

Утас: зүүн joystick — алхах; баруун хоосон хэсгээр drag — камер; action, jump, interaction тусдаа товч. Доод UI нь safe area-г тооцно, бүх товч дор хаяж 44 CSS pixel хүрэх талбайтай. Pointercancel/focus loss үед оролтыг цэвэрлэнэ. Lobby болон Backpack нь босоо, хэвтээ viewport-д таарна.

## Хадгалалт ба онлайн хэсгийн зааг
Local тоглоом version бүхий localStorage snapshot ашиглана: coin, catch instances, rods, equipped rod, нийт XP, cumulative stats, collection, unlocked islands, last island, profile nickname/avatar. Нээлттэй арал нь XP-ээс дахин тооцогдоно. Snapshot-ийн төрөл, species/rod ID, жин, coin, XP болон collection-ийг validate хийнэ.

Онлайн lobby-ийн санал болгосон backend нь Supabase Auth, Postgres болон серверийн game API байна. Эхний онлайн identity нь guest account; email/password шаардахгүй. Guest session нь тухайн browser-д хадгалагдана; browser data арилгах эсвэл өөр төхөөрөмж рүү шилжихэд тэр guest identity-г сэргээх баталгаа байхгүй. Account linking нь дараагийн ажил.

Онлайн үед сервер нь player state-ийн эх сурвалж байна. Catch, sell, buy/equip API нь identity, зөвшөөрөгдсөн fish/rod data, capacity/balance, duplicate operation ID-г шалгана. Мөнгө болон inventory өөрчлөлтийг атомик transaction-аар хэрэгжүүлнэ. Top нь серверийн state-аас тооцогдоно; local save файлыг шууд leaderboard score болгон upload хийхгүй.

Owner state нь эзэмшигчээр хязгаарлагдсан RLS-тэй; friend requests нь зөвхөн оролцогч талууддаа харагдана. Хүсэлт зөвшөөрөх эрх нь recipient-д байна. Public profile/ranking нь зөвхөн нийтэд харуулах fields ашиглана. Үйлчилгээний secret/service-role key browser client-д байхгүй. Query/ownership/Friend-code хайлтын columns болон Top sort metric дээр хэрэгтэй индексийг backend төлөвлөгөөнд тодорхойлно.

Network error эсвэл backend тохируулаагүй үед local тоглоом ашиглаж болно. Онлайн хүлээгдэж байгаа catch/sell/buy үйлдлийг баталгаажих хүртэл амжилттай мэт тооцохгүй; retry нь ижил operation ID ашиглана. Local guest болон онлайн profile нь тусдаа state; офлайн XP-г онлайн XP-д автоматаар нэгтгэхгүй. UI нь аль profile ашиглаж байгааг тодорхой харуулна.

## Кодын бүтэц ба байршуулалт
Build шаардлагагүй browser ES module бүтэц:
- `index.html`, `css/game.css` — shell, HUD, lobby болон responsive UI.
- `js/main.js` — lifecycle, animation loop, module wiring.
- `js/world.js`, `js/player.js` — гурван орчны factory, collision, дүр/камер.
- `js/fishing.js`, `js/data.js` — fishing state machine, 25 загас/rarity/савааны data.
- `js/inventory.js`, `js/progression.js`, `js/save.js` — Backpack, coin/XP/stat operations, local validation.
- `js/ui.js`, `js/lobby.js` — UI interactions болон lobby navigation.
- `js/services/local.js`, `js/services/online.js` — ижил game-service interface бүхий state access.
- `vendor/` — тодорхой хувилбартай Three.js, онлайн client dependency ба лиценз.
- `supabase/` — онлайн хэсгийн schema, policies болон server function source.

Гаднын CDN-ээс runtime dependency татахгүй. Source-ийг `FGadaruugan/fisch` репод commit хийж, статик client-ийг GitHub Pages дээр байршуулна. Онлайн backend тусдаа Supabase project-д ажиллана. README нь удирдлага, local HTTP server, client/server тохиргоог тайлбарлана. Backend project болон credentials одоогоор үүсгээгүй; энэ нь загварын санал.

## Баталгаажуулалт
- Data: unique 25 species ID, 10/8/4/2/1 rarity counts, min/max weight, арал бүрийн 7/8/10 species count.
- Fishing: бүх transition, bite/escape, timer pause, cancel, нэг catch нэг удаа.
- Backpack/shop: Name/kg formatting, 100 slot, sort/filter, sell once, buy/equip validation.
- Progression: Lv.2/3/5 босго, арал unlock, sell хийсний дараах рекорд/collection.
- Save: corrupt/out-of-range state, үл мэдэх species/rod, storage failure.
- UI: lobby → Play → catch → Backpack → sell → upgrade → ferry → Profile → reload; PC болон mobile pointer input.
- Online: өөр user-ийн state-д хүрэхгүй; recipient л request accept хийнэ; duplicate request/catch/sell нь давтан шагнал өгөхгүй; leaderboard ordering/own rank; network retry.

Browser verification боломжгүй бол тэр хязгаарлалтыг тайланд тодорхой бичнэ. Backend холбосны дараа бодит тусдаа guest identities ашиглан Top/Friends-ийн бүрэн урсгалыг шалгана.

## Онлайн хэрэгжүүлэлтийн лавлагаа
- https://supabase.com/docs/guides/auth/auth-anonymous
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Review хийхэд анхаарах сонголт
25 загас, Name/kg, Backpack, 3 арал болон Lobby sections нь хэрэглэгчийн шууд шаардлага. Арлын нэр/сэдэв, Lv.3/Lv.5 unlock, catch XP/үнэ, Backpack capacity болон friend-list scope нь санал болгосон implementation defaults. Friends-д shared-world play сонговол тэр хэсгийг тусдаа архитектураар өргөжүүлнэ.
