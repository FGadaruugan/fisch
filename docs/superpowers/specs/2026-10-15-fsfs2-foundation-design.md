# FSFS 2 — Суурь ба ахиц хамгаалалт

Огноо: 2026-10-15. Төлөв: хэрэглэгчийн бичгэн загварын хяналтад.
Суурь commit: 53d00cc187f51e045f94799e66dc49a2f207109c.

## Зорилго

FSFS 1 → FSFS 2 нь Fisch-ийн том шинэчлэл. FSFS 2 нь ерөнхий систем,
ColorOS 2 нь интерфэйс ба өнгө төрхийн хэсэг. Хуучин тоглогчийн загас,
мөнгө, XP, саваа, цуглуулга, рекорд, арлын ахиц, зүрхийг хамгаалж байж
шинэ боломжууд нэмнэ. Эхний хэрэгжүүлэх хэсэг нь кодын аудит болон
хадгалалтын хамгаалалт; бүх roadmap нэг дор хийгдсэн гэж зарлахгүй.

## Шалгасан одоогийн байдал

- Three.js static browser game; GitHub Pages, local болон Supabase account горимтой.
- 130 тест амжилттай; npm run check 97 JS/TS файл, 56 HTML ID болон bundle шалгасан.
- Автомат графикийн түвшин, FPS хэмжилт, frame pacing, арлын streaming/LOD аль хэдийн бий.
- Сервер revision, operation receipt, transaction болон account ownership шалгалттай.
- Local save: fisch3d.save.v1; snapshot.version = 1.
- Online adapter, import болон SQL constraint мөн version 1 шаарддаг.
- Зүрх browser-local preference: local болон online owner ID тус бүр өөр key-тэй.
- Бодит төхөөрөмжийн FPS, GPU ачаалал, loading хугацааг энэ аудит хэмжээгүй.

Баталсан асуудал: synthetic version:2 save (9876 coin, 1600 XP) local service-д
уншуулахад initial state болдог. Дараа нь profile update хийхэд анхны өгөгдлийг
version:1, 0 coin, 0 XP өгөгдлөөр дарж бичсэн. Зөвхөн memoryStorage дээр туршсан.
Энэ нь FSFS 2 нэр өгөхийн тулд snapshot.version-ийг шууд 2 болгох ёсгүйг харуулна.

## Сонгосон арга

Одоогийн архитектурыг үргэлжлүүлнэ. Бүх тоглоомыг шинээр бичихгүй.
Бүтээгдэхүүний FSFS 2 хувилбар болон save schema version тусдаа ойлголт байна.
Эхний үе snapshot.version=1, backend contract болон existing storage key-г хадгална.
Schema migration шаардлагатай дараагийн өөрчлөлтөд тусдаа migration загвар хийнэ.

## Эхний үеийн бүтэц

### 1. Хадгалалтыг унших, хамгаалах модуль

Шинэ js/storage.js нь local persistence-ийг эзэмшинэ; js/save.js нь цэвэр
validation/normalization, js/services/local.js нь game mutation-аа үргэлжлүүлнэ.
Storage boundary нь missing, supported, damaged, unsupported, unavailable төлөвийг ялгана.

- Missing: шинэ тоглогчийн initial save үүсгэж болно.
- Supported v1: normalize хийж тоглолтыг сэргээнэ. Хүчинтэй ахиц өөрчлөгдөхгүй.
- Damaged: эвдэрсэн эх текстийг recovery key-д хадгалсны дараа л үндсэн key-г
  шинэчилнэ. Эхийг хадгалж чадаагүй бол түүнийг дарж бичихгүй; session-д тоглож болно.
- Unsupported version: эх өгөгдлийг өөрчлөхгүй, persistent local mutation-ийг хориглоно.
  Тоглогчид шинэ хувилбар шаардлагатайг тодорхой мэдэгдэнэ. Үүнийг хоосон save мэт
  account import хийхгүй. Account нэвтрэх боломжийг тусад нь хэвээр байлгана.
- Unavailable: одоогийн session тоглох боломжтой, хадгалагдахгүй байгааг мэдэгдэнэ.

### 2. Нөөц ба сэргээх

Үндсэн save-г бичихээс өмнө өмнөх хүчинтэй save-г нэг backup slot-д бичнэ.
Бичилт амжилтгүй бол хамгийн сүүлчийн сайн save-г хадгалж, SAVE_UNAVAILABLE мэдэгдэнэ.
Үндсэн save гэмтсэн үед backup хүчинтэй бол түүнийг сэргээнэ; гэмтсэн эхийг
хадгалж чадахгүй бол автомат overwrite хийхгүй. Backup ч гэмтсэн бол шинэ
session эхлүүлж болох ч эхүүдийг алга болгохгүй. Нөөцийн тоог хязгаарлаж quota-г
дүүргэхгүй. Browser data бүхэлд нь устгавал local backup мөн устдаг.

Backup нь local ахицын хамгаалалт; cloud account-г local backup-аар дарж солихгүй.
Одоогийн зүрхний key-үүдийг хадгалж, reload болон Sell All хамгаалалтыг regression
тестээр батална. Cloud зүрх sync нь Save 2 шатанд тусдаа хэрэгжинэ.

### 3. Тоглогчийн мэдээлэл ба алдаа

Хадгалалт сэргэсэн, хадгалж болохгүй, илүү шинэ save таарсан гэсэн Монгол мэдэгдэлтэй.
Хэрэглэгчийн цэсэнд raw JSON, SQL, token, дотоод key харуулахгүй.
Энэ эхний хэсгийг бүх FSFS 2 шинэчлэл бэлэн болсон мэт нэрлэхгүй.

## Хүрэх файлууд

- js/storage.js: storage boundary, backup, recovery, supported-version gate.
- js/services/local.js: шинэ persistence модультай холбоно.
- js/errors.js: тоглогчид ойлгомжтой төлөвийн мэдэгдлүүд.
- js/main.js болон js/ui/profile.js: incompatible local save-г import хийхээс хамгаалах
  шаардлагатай холболт; online account нэвтрэлтийг хаахгүй.
- tests/save.test.js, tests/service.test.js, шинэ storage test: regression ба failure cases.
- README.md: бодитоор хэрэгжсэн хамгаалалт, хязгаар.
- web/: build-ээр дахин гаргах runtime.

Энэ хэсэг live Supabase schema, Auth provider, Mini-3Dgame өгөгдлийг өөрчлөхгүй.

## Хүлээн авах шалгуур

1. Одоогийн хүчинтэй save reload хийсний дараа бүх ахиц, загасны ID, жин, огноо хадгалагдана.
2. Ирээдүйн/танихгүй save version-тэй үед үндсэн өгөгдөл byte-for-byte өөрчлөгдөхгүй.
3. Тийм save-г шинэ тоглогч гэж үзэж cloud import хийхгүй; account login ажиллана.
4. Гэмтсэн үндсэн save + хүчинтэй backup үед ахицыг сэргээж мэдэгдэнэ.
5. Backup/quarantine/primary бичилт бүрийн quota болон permission failure-д сайн эхийг устгахгүй.
6. Empty storage болон private/unavailable storage үед ажиллагаа тодорхой байна.
7. Local/online owner солиход ❤️ холилдохгүй; Sell All зүрхтэй загасыг үлдээнэ.
8. Одоогийн 130 тест, шинэ regression тест, build, site check амжилттай байна.
9. Нэг local ба нэг online account урсгалыг browser smoke-оор боломжтой орчинд шалгана;
   шалгаагүй төхөөрөмжийн гүйцэтгэлийг сайжирсан гэж дүгнэхгүй.

## Дараагийн FSFS 2 үеүүд

1. Гүйцэтгэл: бодит desktop/mobile baseline, frame-time болон ачаалах хугацаа,
   дараа нь хэмжилтээр батлагдсан bottleneck-ийг засах.
2. ColorOS 2: цэс, Backpack, Profile, дэлгүүр, touch layout; visual design-ийг тусад нь хянуулах.
3. Fishing 2: загасны зан төлөв, өгөөш, Perfect Catch; reward ба хүндрэлийн дүрмийг тодорхойлох.
4. Ocean 2: цаг агаар, өдөр-шөнө, тусгай загас; сул төхөөрөмжийн fallback.
5. Journey 2: NPC даалгавар, цуглуулгын шагнал, тоноглолын ахиц.
6. Save 2: cloud favorites болон төхөөрөмж хоорондын sync; ownership, conflict,
   migration болон серверийн Sell All хамгаалалтыг хамтад нь боловсруулах.
7. Нэгдсэн туршилт, хувилбарын тайлбар, main/Pages нийтлэлт, live smoke шалгалт.

Multiplayer нь FSFS 2 тогтвортой болсны дараах тусдаа төсөл.

## Нийтлэх ба буцаах

Тусдаа feat/fsfs2-foundation branch дээр хэрэгжүүлж, тест болон review хийсний дараа
PR гаргана. Нийтлэхэд эх код болон generated web runtime нэг commit-д тохирно.
Алдаа гарвал өмнөх app build рүү буцааж болно; v1 contract хадгалсан тул schema
буцаах migration шаардахгүй. Local backup нь төхөөрөмж дээрх сэргээх боломж юм.

## Хяналтын шийдвэр

Энэ бичгэн загварыг баталсны дараа file-by-file хэрэгжүүлэх төлөвлөгөө гаргаж,
эхний хадгалалтын хамгаалалтын кодыг тестээс эхлэн хэрэгжүүлнэ.
