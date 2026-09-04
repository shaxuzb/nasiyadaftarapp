# PIN Login va Biometrik Qulf Dizayni

## Maqsad

Nasiya Daftari’da foydalanuvchi autentifikatsiyadan o‘tgach 4 xonali PIN yaratadi. Saqlangan sessiya bilan ilova qayta ochilganda foydalanuvchi PIN yoki qurilmadagi biometrika yordamida ilovani ochadi. Haqiqiy hisobdan chiqish esa server va lokal sessiyani tugatishda davom etadi.

## Qarorlar

- PIN email yoki telefon raqamiga emas, `AuthUser.id` bo‘lgan o‘zgarmas sonli foydalanuvchi identifikatoriga bog‘lanadi.
- Email, telefon raqami va ism faqat PIN qulf ekranida qaysi hisob tanlanganini ko‘rsatish uchun non-sensitive profil metama’lumoti sifatida saqlanadi.
- PIN verifieri, biometrik ruxsat va xato urinish holati `expo-secure-store` orqali saqlanadi. PIN, token va refresh token `AsyncStorage`ga yozilmaydi va log qilinmaydi.
- PIN 4 xonali raqamdan iborat. Ketma-ket bir xil raqamlar (`0000`, `1111`) va oddiy ketma-ketliklar (`0123`, `1234`, `4321`, `9876`) qabul qilinmaydi.
- PIN o‘rnatilgan bo‘lsa, foydalanuvchi undan keyingi haqiqiy login/registratsiyada uni qaytadan yaratmaydi. PIN mavjud bo‘lmasa, autentifikatsiyadan keyin o‘rnatish oqimi majburiy ishlaydi.
- Face ID, Touch ID yoki Android barmoq izi qurilmaning imkoniyatiga qarab avtomatik nomlanadi. Biometrik ruxsat faqat PIN muvaffaqiyatli tasdiqlangandan keyin yoqilishi mumkin.

## Sessiya va logout semantikasi

Ikki amal alohida bo‘ladi:

1. **Ilovani qulflash**: server sessiyasi va tokenlar saqlanadi, foydalanuvchi darhol PIN/biometrika ekraniga qaytadi. Bu tezkor, lokal qulf hisoblanadi.
2. **Hisobdan chiqish**: mavjud `logout()` oqimi refresh tokenni serverda bekor qilishga urinadi va SecureStore’dagi auth sessiyasini o‘chiradi. PIN yozuvi user ID ostida qoladi, biroq u sessiyani tiklay olmaydi. Shu foydalanuvchi keyin login/parol yoki Google orqali muvaffaqiyatli autentifikatsiyadan o‘tsa, oldingi PIN sozlamasi qayta ishlatiladi.

Shunday qilib, PIN backend login o‘rnini bosmaydi va tokenlarni logoutdan keyin saqlab qolmaydi.

## Foydalanuvchi oqimlari

### 1. PIN yaratish

1. Login, Google login yoki SMS bilan registratsiya muvaffaqiyatli yakunlanadi.
2. Auth session SecureStore’ga saqlanadi.
3. Agar aynan `user.id` uchun PIN mavjud bo‘lmasa, app asosiy navigatsiyadan oldin `PIN yaratish` ekranini ko‘rsatadi.
4. Foydalanuvchi 4 xonali, ruxsat etilgan PIN kiritadi.
5. Ikkinchi ekranda shu PIN’ni takrorlaydi. Mos kelmasa PIN maydonlari tozalanadi va aniq xabar chiqadi.
6. PIN saqlangach, biometrika mavjud bo‘lsa, uni yoqish taklif qilinadi; rad etish oqimni to‘xtatmaydi.
7. Tashkilot tanlash yoki asosiy navigatsiya oqimi davom etadi.

### 2. Saqlangan sessiya bilan qayta ochish

1. Bootstrapping auth sessiyani odatdagidek SecureStore’dan o‘qiydi.
2. Sessiyada foydalanuvchi va uning `user.id` PIN yozuvi mavjud bo‘lsa, ilova navigatsiyani PIN qulf ekrani bilan yopadi.
3. Foydalanuvchi 4 xonali PIN kiritadi yoki biometrik tugmani bosadi.
4. To‘g‘ri tasdiqlash qulfni ochadi. Noto‘g‘ri urinishlar hisoblanadi.
5. Beshinchi ketma-ket noto‘g‘ri PIN haqiqiy logoutni ishga tushiradi. Foydalanuvchi odatiy login ekraniga qaytadi.

### 3. Profil orqali boshqarish

`Profil → Kirish va xavfsizlik` ichiga PIN-login kartasi qo‘shiladi:

- `PIN login` — faol holat va PIN’ni o‘zgartirish oqimi;
- `Biometrik kirish` — faqat qurilma qo‘llasa ko‘rinadigan switch;
- `Ilovani qulflash` — lokal qulfni darhol faollashtiradi.

PIN’ni o‘zgartirishda avval amaldagi PIN, keyin yangi PIN va uning tasdig‘i so‘raladi. Biometrik ruxsat yangi PIN o‘rnatilgach saqlanib qoladi.

## Arxitektura

### Ma’lumotlar va chegaralar

`src/modules/pin-auth/` mustaqil modul bo‘ladi:

- `types.ts` — PIN yozuvi, qulf holati va biometrik imkoniyat turlari;
- `services/pinStorage.ts` — user-ID-namespaced SecureStore kalitlari, migratsiyasiz o‘qish/yozish/o‘chirish;
- `utils/pinValidation.ts` — 4 xonali format va xavfsiz bo‘lmagan PIN qoidalari; toza, testlanadigan funksiyalar;
- `services/biometricAuth.ts` — `expo-local-authentication` atrofidagi qurilmaga xos nom, mavjudlik va autentifikatsiya adapteri;
- `context/AppLockContext.tsx` — auth va PIN xizmatlarini birlashtirib, `isReady`, `isLocked`, `setupRequired`, `unlock`, `lock`, `changePin` kabi UI-agnostik holatni beradi;
- `components/PinKeypad.tsx` va `components/PinDots.tsx` — ikkala iOS/Android PIN ekranlari uchun umumiy, accessibility’li input UI;
- `screens/PinSetupScreen.tsx`, `PinUnlockScreen.tsx`, `PinChangeScreen.tsx` — dizayn maketidagi oqimlarni chiqaradi.

`AuthProvider` token va backend autentifikatsiyasining yagona egasi bo‘lib qoladi. `AppLockProvider` auth bootstrap tugagandan keyingina user ID’ni oladi; u tokenlarni o‘qimaydi, yangilamaydi yoki logout semantikasini almashtirmaydi.

### Root navigatsiya

Root render tartibi:

1. Auth bootstrap yoki PIN holati yuklanayotgan bo‘lsa, splash/loading;
2. Auth sessiyasi bo‘lmasa, mavjud Auth navigator;
3. Sessiya bor va PIN sozlanmagan bo‘lsa, PIN setup navigator;
4. Sessiya bor, PIN sozlangan, app qulflangan bo‘lsa, PIN unlock navigator;
5. Faqat sessiya bor va qulf ochilgan bo‘lsa, mavjud tashkilot/ilova navigatorlari.

Bu tartib himoyalangan asosiy ekranning PIN tekshiruvdan bir lahza ham oldin ko‘rinmasligini ta’minlaydi.

## Saqlash modeli

Har bir kalit `user.id` bilan namespacelanadi, masalan `pin-auth:v1:<userId>`.

SecureStore yozuvi quyidagilarni o‘z ichiga oladi:

- versiya;
- PIN verifieri va uning tasodifiy salt’i;
- biometrik kirish yoqilgan/yoqilmagani;
- oxirgi ko‘rsatiladigan hisob metama’lumoti (`fullName`, maskalangan telefon yoki email);
- xato urinishlar soni.

Hech qaysi PIN yozuvi access token, refresh token, parol yoki to‘liq SMS kodni nusxalamaydi. Profil identifikatori o‘zgarsa, keyingi muvaffaqiyatli autentifikatsiyada display metadata yangilanadi; `user.id` kaliti o‘zgarmaydi.

## Xatoliklar va platforma holatlari

- SecureStore o‘qilishi yoki yozilishi bajarilmasa, foydalanuvchi xavfsiz xabar ko‘radi va PIN setup/login oqimidan himoyalanmagan asosiy ekranga o‘tmaydi.
- Biometrika mavjud bo‘lmasa, ro‘yxat qatori ko‘rinmaydi yoki `Mavjud emas` holatini aniq ko‘rsatadi; PIN login to‘liq ishlaydi.
- Biometrik autentifikatsiya bekor qilinsa, xato deb hisoblanmaydi va PIN keypad faol qoladi.
- Biometrik auth muvaffaqiyatsiz bo‘lsa yoki qurilmada ro‘yxatdan o‘tmagan bo‘lsa, PIN fallback doim mavjud bo‘ladi.
- PIN urinish limitiga yetilganda `AuthProvider.logout()` ishlatiladi; bu auth cleanup qoidalarini takrorlamaydi.

## UI qoidalari

- Ilova theme tokenlari: light `#0B5DEB` primary, `#E7F0FF` primary-light, `#F7F9FC` fon, hozirgi radius va typography qiymatlari ishlatiladi.
- PIN uzoq password input emas: yirik nuqtalar, haptics, 3×4 numeric keypad va bir xil ekran tuzilishi.
- iOS’da biometrik tugma Face ID yoki Touch ID, Android’da Barmoq izi deb chiqadi; hech bir platforma nomi qattiq yozilmaydi.
- Barcha yangi tugmalar accessibility label, state va katta bosish maydoniga ega bo‘ladi.

## Test va tekshiruv

- `pinValidation` uchun testlar: 4 xonali qabul qilish, uzunlik/rakam bo‘lmagan qiymatlar, taqiqlangan ketma-ketliklar va takrorlar.
- Storage kalitlari va user ID isolation testlari: bir foydalanuvchining PIN yozuvi boshqasiga ko‘rinmasligi.
- Lock state reducer/logic testlari: PIN sozlanmagan, qulf ochish, biometric fallback, 5 ta xato urinishdagi logout signali.
- Typecheck, yangi testlar va Android debug build bajariladi.
- Android fizik qurilmasida barmoq izi, iOS fizik qurilmasida Face ID/Touch ID qo‘lda tekshiriladi; simulator biometrik oqimning yakuniy isboti hisoblanmaydi.

## Qamrovdan tashqari

- Backend API’da PIN yoki biometrik credential saqlash.
- PIN bilan serverga mustaqil login qilish yoki logoutdan keyingi tokenni tiklash.
- Bir qurilmadan ikkinchisiga PIN’ni ko‘chirish.
- Face ID/Touch ID’ni email/telefon identifikatori sifatida ishlatish.
