import type { PaymentCopy } from "../paymentCopy";

export const trPaymentCopy: PaymentCopy = {
  checkout: {
    externalHint:
      "Ödeme güvenli bir harici sayfada devam eder. Kart bilgileri uygulamaya girilmez.",
    freeHint:
      "Bu tarife ücretsiz. Onayladıktan sonra etkinleştirme sunucu tarafında başlar.",
    methodTitle: "Ödeme yöntemi",
    methodHint: "Devam etmek için ödeme yöntemini seçin",
    pay: "Öde: {amount}",
    activate: "Tarifeye geç",
    buyPackage: "SMS paketi satın al",
    processing: "Ödeme hazırlanıyor...",
    cancel: "İptal",
    error: "Ödeme siparişi oluşturulamadı",
  },
  pendingBanner: {
    title: "Ödeme bekleniyor",
    multiple: "Bekleyen ödeme: {count}",
    select: "Devam etmek için seçin",
    plan: "Tarife",
    package: "SMS paketi",
    action: "Devam et",
  },
  pendingSheet: {
    title: "Bekleyen ödemeler",
    description: "Devam etmek için siparişi seçin.",
    plan: "Tarife",
    package: "SMS paketi",
    pending: "Ödeme bekleniyor",
    holding: "Ödeme işleniyor",
    activating: "Etkinleştiriliyor",
    loading: "Ödeme bilgisi yükleniyor...",
    continue: "Devam et",
    close: "Kapat",
    empty: "Bekleyen ödeme bulunamadı.",
  },
  statusSheet: {
    title: "Ödeme durumu",
    waiting:
      "Ödeme henüz tamamlanmadı. Ödeme sayfasına devam edebilir veya durumu kontrol edebilirsiniz.",
    holding:
      "Ödeme, ödeme sağlayıcısı tarafından işleniyor. Biraz sonra durumu yenileyin.",
    activating:
      "Ödeme alındı. Hizmet sunucu tarafından etkinleştiriliyor.",
    success: "Ödeme başarıyla tamamlandı ve hizmet etkinleştirildi.",
    refunded:
      "Ödeme iade edildi. Yeni satın alma için tarife veya SMS paketi seçin.",
    terminal:
      "Bu ödeme sonuçlandı. Yeni satın alma için tarifeyi veya SMS paketini yeniden seçin.",
    continue: "Ödemeye devam et",
    refresh: "Durumu yenile",
    cancel: "Ödemeyi iptal et",
    close: "Kapat",
    cancelTitle: "Ödeme iptal edilsin mi?",
    cancelMessage: "Yalnızca henüz ödenmemiş sipariş iptal edilir.",
    error: "Ödeme durumu yenilenemedi",
    openError: "Ödeme sayfası açılamadı",
    loading: "Ödeme bilgisi yükleniyor...",
  },
  detailSheet: {
    title: "Ödeme ayrıntıları",
    continue: "Ödemeye devam et",
    refresh: "Durumu yenile",
    cancel: "Ödemeyi iptal et",
    close: "Kapat",
    cancelTitle: "Ödeme iptal edilsin mi?",
    cancelMessage: "Yalnızca henüz ödenmemiş sipariş iptal edilir.",
    error: "Ödeme bilgisi yenilenemedi",
    openError: "Ödeme sayfası açılamadı",
    loading: "Ödeme ayrıntıları yükleniyor...",
  },
  history: {
    title: "Ödeme geçmişi",
    empty: "Henüz ödeme yok",
    error: "Ödemeler yüklenemedi",
    retry: "Tekrar dene",
    fulfilled: "Etkinleştirildi",
  },
  order: {
    status: {
      pending: "Ödeme bekleniyor",
      holding: "Ödeme işleniyor",
      paid: "Ödeme alındı",
      cancelled: "Ödeme iptal edildi",
      failed: "Ödeme başarısız oldu",
      expired: "Ödeme süresi doldu",
      refunded: "Ödeme iade edildi",
    },
    fulfilled: "Hizmet etkinleştirildi",
    provider: "Sağlayıcı",
    account: "Hesap numarası",
    created: "Oluşturuldu",
    paid: "Ödendi",
    fulfilledAt: "Etkinleştirildi",
    orderId: "Sipariş ID",
  },
};
