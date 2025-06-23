export const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID!;
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

export const CARD_NUM = process.env.CARD_NUM!;
export const PHONE_NUM = process.env.PHONE_NUM!;

export const PRICES = {
  example: 299,
  exampleWithVideo: 498,
  review: 499,
  reviewWithExamples: 698,
  full: {
    junior: 1999,
    pro: 2999,
    lead: 3999,
  },
};

export const PAYMENT_INFO = `Для оплаты переведите сумму одним из удобных способов:\n\n💳 Картой по номеру: ${CARD_NUM}\n📞 По номеру телефона (СБП): ${PHONE_NUM}\n\nПосле оплаты прикрепите чек.`; 
