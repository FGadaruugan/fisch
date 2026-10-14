export class GameError extends Error {
  constructor(code,message=code) { super(message); this.name='GameError';this.code=code; }
}
export const MESSAGES = Object.freeze({
  BACKPACK_FULL:'Backpack дүүрлээ. Худалдаачинд загасаа зараарай.',
  FISH_ESCAPED:'Загас мултарлаа. Дахин шидээд үзээрэй.',
  ISLAND_LOCKED:'Энэ аралд очихын тулд Level-ээ ахиулаарай.',
  WRONG_ISLAND:'Одоогийн арлын загасчлах бүсэд очоорой.',
  FISHING_BUSY:'Эхлээд одоогийн загасчлалаа дуусгаарай.',
  NOT_ENOUGH_COINS:'Coin хүрэлцэхгүй байна.',
  ROD_NOT_OWNED:'Энэ савааг эхлээд худалдаж аваарай.',
  ROD_ALREADY_OWNED:'Энэ саваа танд байгаа.',
  INVALID_FISH:'Энэ загасны мэдээлэл хүчингүй байна.',
  INVALID_ROD:'Савааны мэдээлэл хүчингүй байна.',
  INVALID_PROFILE:'Нэрээ 1–18 тэмдэгтээр оруулаарай.',
  EMPTY_BACKPACK:'Зарах загас алга байна.',
  FISH_NOT_OWNED:'Сонгосон загас Backpack-д байхгүй байна.',
  NEAR_MERCHANT:'Загасаа зарахын тулд худалдаачны дэргэд очоорой.',
  NEAR_WATER:'Тавцан эсвэл эргийн усанд ойртоорой.',
  SAVE_UNAVAILABLE:'Энэ browser ахиц хадгалах боломжгүй байна. Тоглолт үргэлжилнэ.',
  SAVE_RECOVERED:'Хадгалсан мэдээлэл уншигдсангүй. Шинэ local profile нээлээ.',
  ONLINE_UNAVAILABLE:'Онлайн үйлчилгээ хараахан холбогдоогүй байна.',
  AUTH_REQUIRED:'Онлайн profile нэвтэрсэнгүй. Холболтоо шалгаад дахин оролдоорой.',
  FRIEND_NOT_FOUND:'Энэ code-той найз олдсонгүй.',
  INVALID_FRIEND_CODE:'Friend code нь 12 тэмдэгт байна.',
  SELF_REQUEST:'Өөрийгөө найзаар нэмэх боломжгүй.',
  ALREADY_FRIENDS:'Энэ тоглогч таны найз байна.',
  REQUEST_CLOSED:'Энэ хүсэлт аль хэдийн шийдэгдсэн байна.',
  FORBIDDEN:'Энэ үйлдлийг хийх эрх байхгүй.',
  CAST_NOT_FOUND:'Загасчлал дууссан эсвэл хугацаа нь өнгөрсөн байна.',
  CAST_TOO_EARLY:'Загасчлалын үр дүн хэт эрт ирлээ. Дахин оролдоорой.',
  CONFLICT_RETRY:'Ахиц өөр цонхонд шинэчлэгдсэн байна. Дахин оролдоорой.',
  NETWORK_ERROR:'Холболт тасарлаа. Дахин оролдоорой.',
  OPERATION_CONFLICT:'Үйлдлийн дугаар давхцлаа. Дахин оролдоорой.',
  UNKNOWN:'Үйлдлийг хийж чадсангүй. Дахин оролдоорой.'
});
export const messageFor = error => MESSAGES[typeof error==='string'?error:error?.code] ?? MESSAGES.UNKNOWN;
