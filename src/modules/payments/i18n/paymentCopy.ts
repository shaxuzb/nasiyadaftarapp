import type { Locale } from "../../../i18n/types";

export const PAYMENT_COPY = {
  uz: {
    checkout: {
      planTitle: "Tarifni tasdiqlash",
      packageTitle: "SMS paketni tasdiqlash",
      externalHint:
        "To‘lov xavfsiz tashqi sahifada davom etadi. Karta ma’lumotlari ilovaga kiritilmaydi.",
      freeHint:
        "Bu tarif bepul. Tasdiqlagandan keyin backend orqali faollashtirish boshlanadi.",
      monthlySms: "Oyiga {count} SMS",
      organizations: "{count} ta tashkilotgacha",
      unlimitedOrganizations: "Cheksiz tashkilot",
      smsCount: "{count} ta SMS hisobingizga qo‘shiladi",
      pay: "{amount} to‘lash",
      activate: "Tarifga o‘tish",
      buyPackage: "SMS paketni sotib olish",
      cancel: "Bekor qilish",
      error: "To‘lov buyurtmasini yaratib bo‘lmadi",
    },
    statusSheet: {
      title: "To‘lov holati",
      waiting:
        "To‘lov hali yakunlanmagan. To‘lov oynasini davom ettirishingiz yoki holatni tekshirishingiz mumkin.",
      activating:
        "To‘lov qabul qilindi. Xizmat backend tomonidan faollashtirilmoqda.",
      success: "To‘lov muvaffaqiyatli yakunlandi va xizmat faollashtirildi.",
      terminal:
        "Ushbu to‘lov yakunlangan. Yangi xarid uchun tarif yoki SMS paketni qayta tanlang.",
      continue: "To‘lovni davom ettirish",
      refresh: "Holatni yangilash",
      cancel: "To‘lovni bekor qilish",
      close: "Yopish",
      cancelTitle: "To‘lovni bekor qilasizmi?",
      cancelMessage: "Faqat hali to‘lanmagan buyurtma bekor qilinadi.",
      error: "To‘lov holatini yangilab bo‘lmadi",
      openError: "To‘lov sahifasini ochib bo‘lmadi",
      loading: "To‘lov ma’lumoti yuklanmoqda...",
    },
    detailSheet: {
      title: "To‘lov tafsilotlari",
      continue: "To‘lovni davom ettirish",
      refresh: "Holatni yangilash",
      cancel: "To‘lovni bekor qilish",
      close: "Yopish",
      cancelTitle: "To‘lovni bekor qilasizmi?",
      cancelMessage: "Faqat hali to‘lanmagan buyurtma bekor qilinadi.",
      error: "To‘lov ma’lumotini yangilab bo‘lmadi",
      openError: "To‘lov sahifasini ochib bo‘lmadi",
      loading: "To‘lov tafsilotlari yuklanmoqda...",
    },
    history: {
      title: "To‘lovlar tarixi",
      empty: "Hali to‘lovlar yo‘q",
      error: "To‘lovlarni yuklab bo‘lmadi",
      retry: "Qayta urinish",
      fulfilled: "Faollashtirildi",
    },
    order: {
      status: {
        pending: "To‘lov kutilmoqda",
        paid: "To‘lov qabul qilindi",
        cancelled: "To‘lov bekor qilindi",
        failed: "To‘lov amalga oshmadi",
        expired: "To‘lov muddati tugadi",
      },
      fulfilled: "Xizmat faollashtirildi",
      provider: "Provayder",
      account: "Hisob raqami",
      created: "Yaratilgan",
      paid: "To‘langan",
      fulfilledAt: "Faollashtirilgan",
      orderId: "Buyurtma ID",
    },
  },
  ru: {
    checkout: {
      planTitle: "Подтверждение тарифа",
      packageTitle: "Подтверждение пакета SMS",
      externalHint:
        "Оплата продолжится на защищённой внешней странице. Данные карты не вводятся в приложении.",
      freeHint:
        "Этот тариф бесплатный. После подтверждения активация начнётся через сервер.",
      monthlySms: "{count} SMS в месяц",
      organizations: "До {count} организаций",
      unlimitedOrganizations: "Безлимитные организации",
      smsCount: "На счёт будет добавлено {count} SMS",
      pay: "Оплатить {amount}",
      activate: "Перейти на тариф",
      buyPackage: "Купить пакет SMS",
      cancel: "Отмена",
      error: "Не удалось создать платёжный заказ",
    },
    statusSheet: {
      title: "Статус оплаты",
      waiting:
        "Оплата ещё не завершена. Можно продолжить оплату или обновить статус.",
      activating: "Оплата получена. Услуга активируется на сервере.",
      success: "Оплата успешно завершена, услуга активирована.",
      terminal:
        "Этот платёж завершён. Для новой покупки снова выберите тариф или пакет SMS.",
      continue: "Продолжить оплату",
      refresh: "Обновить статус",
      cancel: "Отменить оплату",
      close: "Закрыть",
      cancelTitle: "Отменить оплату?",
      cancelMessage: "Можно отменить только ещё не оплаченный заказ.",
      error: "Не удалось обновить статус оплаты",
      openError: "Не удалось открыть страницу оплаты",
      loading: "Загрузка данных оплаты...",
    },
    detailSheet: {
      title: "Детали оплаты",
      continue: "Продолжить оплату",
      refresh: "Обновить статус",
      cancel: "Отменить оплату",
      close: "Закрыть",
      cancelTitle: "Отменить оплату?",
      cancelMessage: "Можно отменить только ещё не оплаченный заказ.",
      error: "Не удалось обновить данные оплаты",
      openError: "Не удалось открыть страницу оплаты",
      loading: "Загрузка деталей оплаты...",
    },
    history: {
      title: "История платежей",
      empty: "Платежей пока нет",
      error: "Не удалось загрузить платежи",
      retry: "Повторить",
      fulfilled: "Активировано",
    },
    order: {
      status: {
        pending: "Ожидание оплаты",
        paid: "Оплата получена",
        cancelled: "Оплата отменена",
        failed: "Оплата не выполнена",
        expired: "Срок оплаты истёк",
      },
      fulfilled: "Услуга активирована",
      provider: "Провайдер",
      account: "Номер счёта",
      created: "Создано",
      paid: "Оплачено",
      fulfilledAt: "Активировано",
      orderId: "ID заказа",
    },
  },
} as const;

export function getPaymentCopy(locale: Locale) {
  return PAYMENT_COPY[locale === "ru" ? "ru" : "uz"];
}
