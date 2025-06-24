// Здесь будут реализованы все основные сценарии и логика бота по ТЗ

import { Scenes, Markup } from "telegraf";
import { BotContext } from "./bot.context";
import {
  PAYMENT_INFO,
  ADMIN_CHAT_ID,
  PRICE_EXAMPLE,
  PRICE_EXAMPLE_VIDEO,
  PRICE_REVIEW,
  PRICE_REVIEW_EXAMPLES,
  PRICE_FULL_JUNIOR,
  PRICE_FULL_PRO,
  PRICE_FULL_LEAD,
  PRICE_UPSELL_VIDEO,
  PRICE_UPSELL_EXAMPLES,
} from "./constants";
import {
  isValidEmail,
  isValidImageFile,
  isValidResumeFile,
  generateOrderId,
  isCommand,
  isEmptyText,
  isTooLongText,
  isFileTooLarge,
  isSkipButton,
} from "./utils";
import { sendAdminEmail } from "./email";
import { orders } from "./index";
import { Order } from "./types";
import { MESSAGES } from "./messages";

export const mainMenuScene = new Scenes.BaseScene<BotContext>("mainMenu");

mainMenuScene.enter((ctx) => {
  ctx.reply(
    MESSAGES.mainMenu,
    { ...Markup.keyboard([
      [MESSAGES.buttons.exampleResume],
      [MESSAGES.buttons.reviewResume],
      [MESSAGES.buttons.fullResume],
      [MESSAGES.buttons.exit],
    ]).resize(), parse_mode: 'HTML' }
  );
});

mainMenuScene.hears(MESSAGES.buttons.exampleResume, (ctx) =>
  ctx.scene.enter("exampleScene"),
);
mainMenuScene.hears(MESSAGES.buttons.reviewResume, (ctx) =>
  ctx.scene.enter("reviewScene"),
);
mainMenuScene.hears(MESSAGES.buttons.fullResume, (ctx) =>
  ctx.scene.enter("fullResumeScene"),
);
mainMenuScene.hears(MESSAGES.buttons.exit, (ctx) => {
  ctx.reply(MESSAGES.exit, Markup.removeKeyboard());
  ctx.scene.leave();
});

// --- Сценарий "Пример резюме из базы" ---
export const exampleScene = new Scenes.WizardScene<BotContext>(
  "exampleScene",
  // Шаг 1: Описание услуги и кнопки
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (mainMenu)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    (ctx.session as any).orderType = "example";
    (ctx.session as any).orderId = generateOrderId();
    (ctx.session as any).upsell = false;
    (ctx.session as any).userId = ctx.from?.id;
    // Сохраняем заказ
    orders[(ctx.session as any).orderId] = {
      id: (ctx.session as any).orderId,
      userId: ctx.from?.id!,
      username: ctx.from?.username,
      type: "example",
      status: "pending",
      price: 0,
      createdAt: new Date(),
      delivery: "telegram",
    } as Order;
    console.log(`[ORDER] Новый заказ: ${(ctx.session as any).orderId}, user: ${ctx.from?.id}, услуга: example`);
    await ctx.reply(
      MESSAGES.exampleResume.description,
      { ...Markup.keyboard([
        ["✅ Да, я хочу Пример идеального резюме"],
        [MESSAGES.buttons.editMainMenu],
      ]).resize(), parse_mode: 'HTML' }
    );
    return ctx.wizard.next();
  },
  // Шаг 2: Обработка кнопок и запрос должности
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (exampleScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === "✅ Да, я хочу Пример идеального резюме"
    ) {
      await ctx.reply(
        MESSAGES.exampleResume.requestPosition,
        { ...Markup.keyboard([[MESSAGES.buttons.editMainMenu]]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    } else if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.editMainMenu
    ) {
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    } else {
      await ctx.reply("Пожалуйста, выберите действие с помощью кнопок ниже.", { parse_mode: 'HTML' });
    }
  },
  // Шаг 3: Получение должности
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (exampleScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text !== MESSAGES.buttons.editMainMenu
    ) {
      if (isEmptyText(ctx.message.text)) {
        await ctx.reply("Пожалуйста, введите корректное название должности.", { parse_mode: 'HTML' });
        return;
      }
      if (isTooLongText(ctx.message.text)) {
        await ctx.reply(
          "Слишком длинный текст. Пожалуйста, сократите до 4096 символов.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      (ctx.session as any).position = ctx.message.text.trim();
      await ctx.reply(
        MESSAGES.exampleResume.deliveryChoice,
        { ...Markup.keyboard([
          [MESSAGES.buttons.telegramDelivery],
          [MESSAGES.buttons.emailDelivery],
          [MESSAGES.buttons.back],
        ]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    } else if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.editMainMenu
    ) {
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
    } else {
      await ctx.reply(MESSAGES.common.enterPosition, { parse_mode: 'HTML' });
    }
  },
  // Шаг 4: Выбор способа доставки
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (exampleScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (ctx.message && "text" in ctx.message) {
      if (ctx.message.text === MESSAGES.buttons.telegramDelivery) {
        (ctx.session as any).delivery = "telegram";
        (ctx.session as any).email = undefined;
        orders[(ctx.session as any).orderId].delivery = "telegram";
        orders[(ctx.session as any).orderId].email = undefined;
      } else if (ctx.message.text === MESSAGES.buttons.emailDelivery) {
        (ctx.session as any).delivery = "email";
        orders[(ctx.session as any).orderId].delivery = "email";
        await ctx.reply(MESSAGES.exampleResume.enterEmail, { parse_mode: 'HTML' });
        return; // не next, ждем email
      } else if (ctx.message.text === MESSAGES.buttons.back) {
        await ctx.scene.reenter();
        return;
      } else if (isValidEmail(ctx.message.text)) {
        (ctx.session as any).delivery = "email";
        (ctx.session as any).email = ctx.message.text.trim();
        orders[(ctx.session as any).orderId].delivery = "email";
        orders[(ctx.session as any).orderId].email = ctx.message.text.trim();
      } else {
        await ctx.reply(MESSAGES.exampleResume.invalidEmail, { parse_mode: 'HTML' });
        return;
      }
      // upsell
      await ctx.reply(
        MESSAGES.exampleResume.upsell(),
        { ...Markup.keyboard([
          [MESSAGES.buttons.addVideoAdvice()],
          [MESSAGES.buttons.onlyExample],
        ]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
  },
  // Шаг 5: Upsell
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (exampleScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (ctx.message && "text" in ctx.message) {
      if (ctx.message.text.startsWith("👍")) {
        (ctx.session as any).upsell = true;
      } else {
        (ctx.session as any).upsell = false;
      }
      // Подтверждение заказа
      let price = (ctx.session as any).upsell
        ? PRICE_EXAMPLE + PRICE_UPSELL_VIDEO
        : PRICE_EXAMPLE;
      if (isNaN(price)) {
        console.error(
          "Ошибка: цена example не определена или не число",
          PRICE_EXAMPLE,
          PRICE_UPSELL_VIDEO,
        );
        await ctx.reply(
          "Ошибка: цена услуги не задана. Пожалуйста, обратитесь к администратору.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      (ctx.session as any).price = price;
      await ctx.reply(
        MESSAGES.exampleResume.orderSummary(
          (ctx.session as any).position,
          (ctx.session as any).delivery,
          (ctx.session as any).email || "",
          (ctx.session as any).upsell,
          price,
        ),
        { ...Markup.keyboard([
          [MESSAGES.buttons.confirm],
          [MESSAGES.buttons.editOrder],
        ]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
  },
  // Шаг 6: Подтверждение заказа
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (exampleScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (ctx.message && "text" in ctx.message) {
      if (ctx.message.text === MESSAGES.buttons.confirm) {
        await ctx.reply(
          MESSAGES.exampleResume.paymentInstructions(
            (ctx.session as any).price,
          ),
          { ...Markup.keyboard([[MESSAGES.buttons.attachReceipt]]).resize(), parse_mode: 'HTML' }
        );
        return ctx.wizard.next();
      } else if (ctx.message.text === MESSAGES.buttons.editOrder) {
        await ctx.scene.reenter();
      } else {
        await ctx.reply(MESSAGES.common.confirmOrder, { parse_mode: 'HTML' });
      }
    }
  },
  // Шаг 7: Ожидание оплаты и загрузка чека
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (exampleScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (ctx.message && "text" in ctx.message && ctx.message.text === MESSAGES.buttons.editMainMenu) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} нажал 'в Главное меню' после orderAccepted (exampleScene)`);
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.attachReceipt
    ) {
      await ctx.reply(MESSAGES.exampleResume.attachReceipt, { parse_mode: 'HTML' });
      return;
    }
    if (ctx.message && "photo" in ctx.message) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      if (isFileTooLarge(photo.file_size || 0, 50)) {
        await ctx.reply("Файл слишком большой. Максимальный размер — 50 МБ.", { parse_mode: 'HTML' });
        return;
      }
      (ctx.session as any).receiptFileId = photo.file_id;
      await ctx.reply(
        MESSAGES.exampleResume.orderAccepted((ctx.session as any).orderId),
        { ...Markup.keyboard([[MESSAGES.buttons.editMainMenu]]).resize(), parse_mode: 'HTML' },
      );
      const adminMsg = MESSAGES.exampleResume.adminNotification(
        (ctx.session as any).orderId,
        ctx.from?.first_name || "",
        ctx.from?.username || "",
        (ctx.session as any).userId,
        (ctx.session as any).position,
        (ctx.session as any).delivery,
        (ctx.session as any).email || "",
        (ctx.session as any).upsell,
        (ctx.session as any).price,
      );
      await ctx.telegram.sendPhoto(ADMIN_CHAT_ID, photo.file_id, {
        caption: adminMsg,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📂 Отправить файл",
                callback_data: `send_result_${(ctx.session as any).orderId}_${(ctx.session as any).userId}`,
              },
            ],
          ],
        },
      });
      // Отправляем файл резюме админу
      if ((ctx.session as any).fileId) {
        await ctx.telegram.sendDocument(
          ADMIN_CHAT_ID,
          (ctx.session as any).fileId,
          {
            caption: `Файл резюме пользователя: ${(ctx.session as any).fileName}`,
          },
        );
      }
      await sendAdminEmail(
        `Новый заказ №${(ctx.session as any).orderId}`,
        adminMsg,
      );
      return ctx.scene.leave();
    } else if (ctx.message && "document" in ctx.message) {
      if (
        ctx.message.document &&
        isValidImageFile(ctx.message.document.file_name || "")
      ) {
        if (isFileTooLarge(ctx.message.document.file_size || 0, 20)) {
          await ctx.reply("Файл слишком большой. Максимальный размер — 20 МБ.", { parse_mode: 'HTML' });
          return;
        }
        (ctx.session as any).receiptFileId = ctx.message.document.file_id;
        await ctx.reply(
          MESSAGES.exampleResume.orderAccepted((ctx.session as any).orderId),
          { ...Markup.keyboard([[MESSAGES.buttons.editMainMenu]]).resize(), parse_mode: 'HTML' },
        );
        const adminMsg = MESSAGES.exampleResume.adminNotification(
          (ctx.session as any).orderId,
          ctx.from?.first_name || "",
          ctx.from?.username || "",
          (ctx.session as any).userId,
          (ctx.session as any).position,
          (ctx.session as any).delivery,
          (ctx.session as any).email || "",
          (ctx.session as any).upsell,
          (ctx.session as any).price,
        );
        await ctx.telegram.sendDocument(
          ADMIN_CHAT_ID,
          ctx.message.document.file_id,
          {
            caption: adminMsg,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📂 Отправить файл",
                    callback_data: `send_result_${(ctx.session as any).orderId}_${(ctx.session as any).userId}`,
                  },
                ],
              ],
            },
          },
        );
        // Отправляем файл резюме админу
        if ((ctx.session as any).fileId) {
          await ctx.telegram.sendDocument(
            ADMIN_CHAT_ID,
            (ctx.session as any).fileId,
            {
              caption: `Файл резюме пользователя: ${(ctx.session as any).fileName}`,
            },
          );
        }
        await sendAdminEmail(
          `Новый заказ №${(ctx.session as any).orderId}`,
          adminMsg,
        );
        return ctx.scene.leave();
      } else {
        await ctx.reply(
          "Пожалуйста, прикрепите изображение чека (jpg, jpeg, png).",
          { parse_mode: 'HTML' }
        );
      }
    } else {
      await ctx.reply(
        "Пожалуйста, прикрепите изображение чека (jpg, jpeg, png).",
        { parse_mode: 'HTML' }
      );
    }
  },
);

// --- Сценарий "Разбор-прожарка резюме" ---
export const reviewScene = new Scenes.WizardScene<BotContext>(
  "reviewScene",
  // Шаг 1: Описание услуги
  async (ctx) => {
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text.startsWith("/")
    ) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (reviewScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    (ctx.session as any).orderType = "review";
    (ctx.session as any).orderId = generateOrderId();
    (ctx.session as any).upsell = false;
    (ctx.session as any).userId = ctx.from?.id;
    // Сохраняем заказ
    orders[(ctx.session as any).orderId] = {
      id: (ctx.session as any).orderId,
      userId: ctx.from?.id!,
      username: ctx.from?.username,
      type: "review",
      status: "pending",
      price: 0,
      createdAt: new Date(),
      delivery: "telegram",
    } as Order;
    await ctx.reply(
      MESSAGES.reviewResume.description,
      { ...Markup.keyboard([
        [MESSAGES.buttons.startReview],
        [MESSAGES.buttons.backToMenu],
      ]).resize(), parse_mode: 'HTML' }
    );
    return ctx.wizard.next();
  },
  // Шаг 2: Загрузка файла
  async (ctx) => {
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text.startsWith("/")
    ) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (reviewScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.backToMenu
    ) {
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.startReview
    ) {
      await ctx.reply(MESSAGES.reviewResume.attachFile, { parse_mode: 'HTML' });
      return;
    }
    if (ctx.message && "document" in ctx.message) {
      const fileName = ctx.message.document.file_name || "";
      if (!isValidResumeFile(fileName)) {
        await ctx.reply(MESSAGES.reviewResume.invalidFile, { parse_mode: 'HTML' });
        return;
      }
      if (
        ctx.message.document.file_size &&
        ctx.message.document.file_size > 20 * 1024 * 1024
      ) {
        await ctx.reply("Файл слишком большой. Максимальный размер — 20 МБ.", { parse_mode: 'HTML' });
        return;
      }
      (ctx.session as any).fileId = ctx.message.document.file_id;
      (ctx.session as any).fileName = fileName;
      await ctx.reply(
        MESSAGES.reviewResume.enterPosition,
        Markup.removeKeyboard(),
      );
      return ctx.wizard.next();
    }
    if (ctx.message && "photo" in ctx.message) {
      await ctx.reply(
        "Пожалуйста, отправьте файл резюме в формате .doc, .docx или .pdf, а не фото.",
        { parse_mode: 'HTML' }
      );
      return;
    }
    if (ctx.message && "text" in ctx.message) {
      if (!ctx.message.text.trim()) {
        await ctx.reply("Пожалуйста, прикрепите файл с резюме.", { parse_mode: 'HTML' });
        return;
      }
      await ctx.reply("Пожалуйста, прикрепите файл с резюме.", { parse_mode: 'HTML' });
      return;
    }
    await ctx.reply(MESSAGES.common.attachFile, { parse_mode: 'HTML' });
  },
  // Шаг 3: Сбор дополнительной информации (3 вопроса)
  async (ctx) => {
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text.startsWith("/")
    ) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (reviewScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.skip
    ) {
      (ctx.session as any).position = MESSAGES.common.no;
      await ctx.reply(
        MESSAGES.reviewResume.enterVacancy,
        { ...Markup.keyboard([[MESSAGES.buttons.skip]]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
    if (ctx.message && "text" in ctx.message) {
      if (!ctx.message.text.trim()) {
        await ctx.reply("Пожалуйста, введите должность.", { parse_mode: 'HTML' });
        return;
      }
      if (ctx.message.text.length > 4096) {
        await ctx.reply(
          "Слишком длинный текст. Пожалуйста, сократите до 4096 символов.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      (ctx.session as any).position = ctx.message.text.trim();
      await ctx.reply(
        MESSAGES.reviewResume.enterVacancy,
        { ...Markup.keyboard([[MESSAGES.buttons.skip]]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
    await ctx.reply(MESSAGES.common.enterPositionPrompt, { parse_mode: 'HTML' });
  },
  async (ctx) => {
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text.startsWith("/")
    ) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (reviewScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.skip
    ) {
      (ctx.session as any).vacancyUrl = MESSAGES.common.no;
      await ctx.reply(
        MESSAGES.reviewResume.enterComment,
        { ...Markup.keyboard([[MESSAGES.buttons.skip]]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
    if (ctx.message && "text" in ctx.message) {
      if (ctx.message.text.length > 4096) {
        await ctx.reply(
          "Слишком длинный текст. Пожалуйста, сократите до 4096 символов.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      (ctx.session as any).vacancyUrl = ctx.message.text.trim();
      await ctx.reply(
        MESSAGES.reviewResume.enterComment,
        { ...Markup.keyboard([[MESSAGES.buttons.skip]]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
    await ctx.reply(MESSAGES.common.enterVacancy, { parse_mode: 'HTML' });
  },
  async (ctx) => {
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text.startsWith("/")
    ) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (reviewScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.skip
    ) {
      (ctx.session as any).comment = MESSAGES.common.no;
      // upsell
      await ctx.reply(
        MESSAGES.reviewResume.upsell(),
        { ...Markup.keyboard([
          [MESSAGES.buttons.addExamples()],
          [MESSAGES.buttons.onlyReview],
        ]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
    if (ctx.message && "text" in ctx.message) {
      if (ctx.message.text.length > 4096) {
        await ctx.reply(
          "Слишком длинный текст. Пожалуйста, сократите до 4096 символов.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      (ctx.session as any).comment = ctx.message.text.trim();
      // upsell
      await ctx.reply(
        MESSAGES.reviewResume.upsell(),
        { ...Markup.keyboard([
          [MESSAGES.buttons.addExamples()],
          [MESSAGES.buttons.onlyReview],
        ]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
    await ctx.reply(MESSAGES.common.enterComment, { parse_mode: 'HTML' });
  },
  // Шаг 4: Upsell
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      if (ctx.message.text.startsWith("👍")) {
        (ctx.session as any).upsell = true;
      } else {
        (ctx.session as any).upsell = false;
      }
      // Подтверждение заказа
      let price = (ctx.session as any).upsell
        ? PRICE_REVIEW + PRICE_UPSELL_EXAMPLES
        : PRICE_REVIEW;
      if (isNaN(price)) {
        console.error(
          "Ошибка: цена review не определена или не число",
          PRICE_REVIEW,
          PRICE_UPSELL_EXAMPLES,
        );
        await ctx.reply(
          "Ошибка: цена услуги не задана. Пожалуйста, обратитесь к администратору.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      (ctx.session as any).price = price;
      await ctx.reply(
        MESSAGES.reviewResume.orderSummary(
          (ctx.session as any).fileName,
          (ctx.session as any).position,
          (ctx.session as any).upsell,
          price,
        ),
        { ...Markup.keyboard([
          [MESSAGES.buttons.confirmPayment],
          [MESSAGES.buttons.startOver],
        ]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
  },
  // Шаг 5: Подтверждение заказа
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      if (ctx.message.text === MESSAGES.buttons.confirmPayment) {
        await ctx.reply(
          MESSAGES.exampleResume.paymentInstructions(
            (ctx.session as any).price,
          ),
          { ...Markup.keyboard([[MESSAGES.buttons.attachReceipt]]).resize(), parse_mode: 'HTML' }
        );
        return ctx.wizard.next();
      } else if (ctx.message.text === MESSAGES.buttons.startOver) {
        await ctx.scene.reenter();
      } else {
        await ctx.reply(MESSAGES.common.confirmOrderOrRestart, { parse_mode: 'HTML' });
      }
    }
  },
  // Шаг 6: Ожидание оплаты и загрузка чека
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (reviewScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (ctx.message && "text" in ctx.message && ctx.message.text === MESSAGES.buttons.editMainMenu) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} нажал 'в Главное меню' после orderAccepted (reviewScene)`);
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.attachReceipt
    ) {
      await ctx.reply(MESSAGES.exampleResume.attachReceipt, { parse_mode: 'HTML' });
      return;
    }
    if (ctx.message && "photo" in ctx.message) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      (ctx.session as any).receiptFileId = photo.file_id;
      await ctx.reply(
        MESSAGES.reviewResume.orderAccepted((ctx.session as any).orderId),
        { ...Markup.keyboard([[MESSAGES.buttons.editMainMenu]]).resize(), parse_mode: 'HTML' },
      );
      const adminMsg = MESSAGES.reviewResume.adminNotification(
        (ctx.session as any).orderId,
        ctx.from?.first_name || "",
        ctx.from?.username || "",
        (ctx.session as any).userId,
        (ctx.session as any).fileName,
        (ctx.session as any).position,
        (ctx.session as any).vacancyUrl,
        (ctx.session as any).comment,
        (ctx.session as any).upsell,
        (ctx.session as any).price,
      );
      await ctx.telegram.sendPhoto(ADMIN_CHAT_ID, photo.file_id, {
        caption: adminMsg,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📂 Отправить файл",
                callback_data: `send_result_${(ctx.session as any).orderId}_${(ctx.session as any).userId}`,
              },
            ],
          ],
        },
      });
      // Отправляем файл резюме админу
      if ((ctx.session as any).fileId) {
        await ctx.telegram.sendDocument(
          ADMIN_CHAT_ID,
          (ctx.session as any).fileId,
          {
            caption: `Файл резюме пользователя: ${(ctx.session as any).fileName}`,
          },
        );
      }
      await sendAdminEmail(
        `Новый заказ №${(ctx.session as any).orderId}`,
        adminMsg,
      );
      return ctx.scene.leave();
    } else if (ctx.message && "document" in ctx.message) {
      if (
        ctx.message.document &&
        isValidImageFile(ctx.message.document.file_name || "")
      ) {
        (ctx.session as any).receiptFileId = ctx.message.document.file_id;
        await ctx.reply(
          MESSAGES.reviewResume.orderAccepted((ctx.session as any).orderId),
          { ...Markup.keyboard([[MESSAGES.buttons.editMainMenu]]).resize(), parse_mode: 'HTML' },
        );
        const adminMsg = MESSAGES.reviewResume.adminNotification(
          (ctx.session as any).orderId,
          ctx.from?.first_name || "",
          ctx.from?.username || "",
          (ctx.session as any).userId,
          (ctx.session as any).fileName,
          (ctx.session as any).position,
          (ctx.session as any).vacancyUrl,
          (ctx.session as any).comment,
          (ctx.session as any).upsell,
          (ctx.session as any).price,
        );
        await ctx.telegram.sendDocument(
          ADMIN_CHAT_ID,
          ctx.message.document.file_id,
          {
            caption: adminMsg,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📂 Отправить файл",
                    callback_data: `send_result_${(ctx.session as any).orderId}_${(ctx.session as any).userId}`,
                  },
                ],
              ],
            },
          },
        );
        // Отправляем файл резюме админу
        if ((ctx.session as any).fileId) {
          await ctx.telegram.sendDocument(
            ADMIN_CHAT_ID,
            (ctx.session as any).fileId,
            {
              caption: `Файл резюме пользователя: ${(ctx.session as any).fileName}`,
            },
          );
        }
        await sendAdminEmail(
          `Новый заказ №${(ctx.session as any).orderId}`,
          adminMsg,
        );
        return ctx.scene.leave();
      } else {
        await ctx.reply(MESSAGES.common.attachReceipt, { parse_mode: 'HTML' });
      }
    } else {
      await ctx.reply(MESSAGES.common.attachReceipt, { parse_mode: 'HTML' });
    }
  },
);

// Заглушки для wizard-сцен (будут реализованы далее)
export const fullResumeScene = new Scenes.WizardScene<BotContext>(
  "fullResumeScene",
  // Шаг 1: Описание услуги
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (fullResumeScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (ctx.message && "text" in ctx.message && ctx.message.text === MESSAGES.buttons.backToMenu) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} нажал 'Назад в меню' (fullResumeScene)`);
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    (ctx.session as any).orderType = "full";
    (ctx.session as any).orderId = generateOrderId();
    (ctx.session as any).userId = ctx.from?.id;
    // Сохраняем заказ
    orders[(ctx.session as any).orderId] = {
      id: (ctx.session as any).orderId,
      userId: ctx.from?.id!,
      username: ctx.from?.username,
      type: "full",
      status: "pending",
      price: 0,
      createdAt: new Date(),
      delivery: "telegram",
    } as Order;
    await ctx.reply(
      MESSAGES.fullResume.description,
      { ...Markup.keyboard([
        [MESSAGES.buttons.selectTariff],
        [MESSAGES.buttons.backToMenu],
      ]).resize(), parse_mode: 'HTML' }
    );
    return ctx.wizard.next();
  },
  // Шаг выбора тарифа: обработка нажатия 'Выбрать тариф и начать'
  async (ctx) => {
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.selectTariff
    ) {
      await ctx.reply(
        MESSAGES.fullResume.tariffSelection,
        { ...Markup.keyboard([
          [MESSAGES.buttons.juniorTariff()],
          [MESSAGES.buttons.proTariff()],
          [MESSAGES.buttons.leadTariff()],
          [MESSAGES.buttons.back],
        ]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
    if (ctx.message && "text" in ctx.message && ctx.message.text === MESSAGES.buttons.backToMenu) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} нажал 'Назад в меню' (fullResumeScene, шаг 2)`);
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
  },
  // Следующий шаг: обработка выбора тарифа
  async (ctx) => {
    if (
      ctx.message &&
      typeof ctx.message === "object" &&
      "text" in ctx.message
    ) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} выбрал тариф (fullResumeScene)`);
      let tariff = "";
      let price = 0;
      if (ctx.message.text === MESSAGES.buttons.juniorTariff()) {
        tariff = "junior";
        price = PRICE_FULL_JUNIOR;
      } else if (ctx.message.text === MESSAGES.buttons.proTariff()) {
        tariff = "pro";
        price = PRICE_FULL_PRO;
      } else if (ctx.message.text === MESSAGES.buttons.leadTariff()) {
        tariff = "lead";
        price = PRICE_FULL_LEAD;
      } else if (ctx.message.text === MESSAGES.buttons.back) {
        await ctx.scene.reenter();
        return;
      } else {
        console.log(
          "DEBUG: не совпало ни с одним тарифом, текст:",
          ctx.message.text,
        );
        await ctx.reply(MESSAGES.common.selectTariff, { parse_mode: 'HTML' });
        return;
      }
      console.log("DEBUG: выбран тариф:", tariff, "цена:", price);
      if (isNaN(price)) {
        console.error(
          "Ошибка: цена тарифа не определена или не число",
          tariff,
          price,
        );
        await ctx.reply(
          "Ошибка: цена тарифа не задана. Пожалуйста, обратитесь к администратору.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      (ctx.session as any).tariff = tariff;
      (ctx.session as any).price = price;
      await ctx.reply(MESSAGES.fullResume.attachOldResume, { parse_mode: 'HTML' });
      return ctx.wizard.next();
    }
    await ctx.reply(MESSAGES.common.selectTariff, { parse_mode: 'HTML' });
  },
  // Шаг 3: Сбор информации
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (fullResumeScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (ctx.message && "document" in ctx.message) {
      if (isFileTooLarge(ctx.message.document.file_size || 0, 20)) {
        await ctx.reply("Файл слишком большой. Максимальный размер — 20 МБ.", { parse_mode: 'HTML' });
        return;
      }
      (ctx.session as any).oldResumeFileId = ctx.message.document.file_id;
      (ctx.session as any).oldResumeFileName = ctx.message.document.file_name;
      await ctx.reply(
        MESSAGES.fullResume.enterVacancy,
        { ...Markup.keyboard([[MESSAGES.buttons.skip]]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    } else if (ctx.message && "text" in ctx.message) {
      if (isCommand(ctx.message.text)) {
        console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (fullResumeScene)`);
        await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
        await ctx.scene.leave();
        await ctx.scene.enter("mainMenu");
        return;
      }
      (ctx.session as any).oldResumeFileId = undefined;
      (ctx.session as any).oldResumeFileName = undefined;
      if (ctx.message.text === MESSAGES.buttons.skip) {
        (ctx.session as any).oldResumeFileId = undefined;
        (ctx.session as any).oldResumeFileName = undefined;
      }
      await ctx.reply(
        MESSAGES.fullResume.enterVacancy,
        { ...Markup.keyboard([[MESSAGES.buttons.skip]]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
    await ctx.reply(MESSAGES.fullResume.enterVacancy, { parse_mode: 'HTML' });
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (fullResumeScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (ctx.message && "text" in ctx.message) {
      if (ctx.message.text === MESSAGES.buttons.skip) {
        (ctx.session as any).vacancyUrl = MESSAGES.common.no;
        await ctx.reply(
          MESSAGES.fullResume.enterWishes,
          { ...Markup.keyboard([[MESSAGES.buttons.skip]]).resize(), parse_mode: 'HTML' }
        );
        return ctx.wizard.next();
      }
      if (isEmptyText(ctx.message.text)) {
        await ctx.reply("Пожалуйста, введите ссылку или название должности.", { parse_mode: 'HTML' });
        return;
      }
      if (isTooLongText(ctx.message.text)) {
        await ctx.reply(
          "Слишком длинный текст. Пожалуйста, сократите до 4096 символов.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      (ctx.session as any).vacancyUrl = ctx.message.text.trim();
      await ctx.reply(
        MESSAGES.fullResume.enterWishes,
        { ...Markup.keyboard([[MESSAGES.buttons.skip]]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
    await ctx.reply(MESSAGES.common.enterVacancyOrPosition, { parse_mode: 'HTML' });
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (fullResumeScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (ctx.message && "text" in ctx.message) {
      if (ctx.message.text === MESSAGES.buttons.skip) {
        (ctx.session as any).comment = MESSAGES.common.no;
        // Предоплата
        console.log((ctx.session as any).price);
        const prepay = Math.floor((ctx.session as any).price / 2);
        if (isNaN(prepay)) {
          console.error(
            "Ошибка: предоплата не определена или не число",
            (ctx.session as any).price,
          );
          await ctx.reply(
            "Ошибка: сумма предоплаты не задана. Пожалуйста, обратитесь к администратору.",
            { parse_mode: 'HTML' }
          );
          return;
        }
        await ctx.reply(
          MESSAGES.fullResume.prepaymentInfo(prepay),
          { ...Markup.keyboard([[MESSAGES.buttons.payPrepayment]]).resize(), parse_mode: 'HTML' }
        );
        return ctx.wizard.next();
      }
      if (isEmptyText(ctx.message.text)) {
        await ctx.reply('Пожалуйста, напишите пожелания или "нет".', { parse_mode: 'HTML' });
        return;
      }
      if (isTooLongText(ctx.message.text)) {
        await ctx.reply(
          "Слишком длинный текст. Пожалуйста, сократите до 4096 символов.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      (ctx.session as any).comment = ctx.message.text.trim();
      // Предоплата
      const prepay = Math.floor((ctx.session as any).price / 2);
      if (isNaN(prepay)) {
        console.error(
          "Ошибка: предоплата не определена или не число",
          (ctx.session as any).price,
        );
        await ctx.reply(
          "Ошибка: сумма предоплаты не задана. Пожалуйста, обратитесь к администратору.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      await ctx.reply(
        MESSAGES.fullResume.prepaymentInfo(prepay),
        { ...Markup.keyboard([[MESSAGES.buttons.payPrepayment]]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
    await ctx.reply(MESSAGES.common.enterWishes, { parse_mode: 'HTML' });
  },
  // Шаг 4: Оплата предоплаты
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (fullResumeScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.payPrepayment
    ) {
      // Пересчитываем цену перед расчётом предоплаты
      let price = (ctx.session as any).price;
      let tariff = (ctx.session as any).tariff;
      console.log(
        "DEBUG: tariff:",
        tariff,
        "price:",
        price,
        "upsell:",
        (ctx.session as any).upsell,
      );
      if (!tariff || !["junior", "pro", "lead"].includes(tariff)) {
        console.error("Ошибка: тариф не выбран или невалиден", tariff);
        await ctx.reply(
          "Ошибка: тариф не выбран. Пожалуйста, начните заказ заново и выберите тариф.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      if (typeof price !== "number" || isNaN(price)) {
        // Пересчёт для fullResumeScene
        if (tariff === "junior") price = PRICE_FULL_JUNIOR;
        else if (tariff === "pro") price = PRICE_FULL_PRO;
        else if (tariff === "lead") price = PRICE_FULL_LEAD;
        // Можно добавить доп. опции, если они есть
        if (
          (ctx.session as any).upsell &&
          typeof PRICE_UPSELL_VIDEO === "number"
        ) {
          price += PRICE_UPSELL_VIDEO;
        }
      }
      if (typeof price !== "number" || isNaN(price)) {
        console.error(
          "Ошибка: цена не определена даже после пересчёта",
          tariff,
          price,
        );
        await ctx.reply(
          "Ошибка: цена услуги не задана. Пожалуйста, обратитесь к администратору.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      (ctx.session as any).price = price;
      const prepay = Math.floor(price / 2);
      if (isNaN(prepay)) {
        console.error("Ошибка: предоплата не определена или не число", price);
        await ctx.reply(
          "Ошибка: сумма предоплаты не задана. Пожалуйста, обратитесь к администратору.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      await ctx.reply(
        MESSAGES.fullResume.prepaymentInstructions(prepay),
        { ...Markup.keyboard([[MESSAGES.buttons.attachReceiptPrepay]]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
    await ctx.reply(MESSAGES.common.payPrepayment, { parse_mode: 'HTML' });
  },
  // Шаг 5: Загрузка чека предоплаты
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (fullResumeScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.attachReceiptPrepay
    ) {
      await ctx.reply(MESSAGES.exampleResume.attachReceipt, { parse_mode: 'HTML' });
      return;
    }
    if (ctx.message && "photo" in ctx.message) {
      if (
        isFileTooLarge(
          ctx.message.photo[ctx.message.photo.length - 1].file_size || 0,
          50,
        )
      ) {
        await ctx.reply("Файл слишком большой. Максимальный размер — 50 МБ.", { parse_mode: 'HTML' });
        return;
      }
      (ctx.session as any).prepayReceiptFileId =
        ctx.message.photo[ctx.message.photo.length - 1].file_id;
      await ctx.reply(MESSAGES.fullResume.prepaymentReceived, { parse_mode: 'HTML' });
      return ctx.wizard.next();
    }
    await ctx.reply(MESSAGES.common.attachReceipt, { parse_mode: 'HTML' });
  },
  // Шаг 6: Ожидание выбора времени интервью
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (fullResumeScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (ctx.message && "text" in ctx.message) {
      if (isEmptyText(ctx.message.text)) {
        await ctx.reply("Пожалуйста, введите дату и время интервью.", { parse_mode: 'HTML' });
        return;
      }
      if (isTooLongText(ctx.message.text)) {
        await ctx.reply(
          "Слишком длинный текст. Пожалуйста, сократите до 4096 символов.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      (ctx.session as any).interviewTime = ctx.message.text.trim();
      orders[(ctx.session as any).orderId].interviewTime =
        ctx.message.text.trim();
      require("./index").scheduleInterviewReminders(
        orders[(ctx.session as any).orderId],
        require("./index").bot,
      );
      // Уведомление админу о брони с временем
      const adminMsg = MESSAGES.fullResume.adminBookingNotification(
        (ctx.session as any).orderId,
        ctx.from?.first_name || "",
        ctx.from?.username || "",
        (ctx.session as any).userId,
        (ctx.session as any).tariff,
        (ctx.session as any).interviewTime,
        (ctx.session as any).oldResumeFileName,
        (ctx.session as any).vacancyUrl,
        (ctx.session as any).comment,
      );
      await ctx.telegram.sendMessage(ADMIN_CHAT_ID, adminMsg);
      await sendAdminEmail(
        `Новая бронь №${(ctx.session as any).orderId}`,
        adminMsg,
      );
      await ctx.reply(MESSAGES.fullResume.remindersScheduled, { parse_mode: 'HTML' });
      await ctx.reply(MESSAGES.fullResume.paySecondPart, { parse_mode: 'HTML' });
      await ctx.reply(
        MESSAGES.buttons.payFinal,
        { ...Markup.keyboard([[MESSAGES.buttons.payFinal]]).resize(), parse_mode: 'HTML' }
      );
      // Для теста: напоминания через setTimeout (в проде — cron или внешний сервис)
      // setTimeout(() => { ... }, msTo24hBefore)
      // setTimeout(() => { ... }, msTo1hBefore)
      return ctx.wizard.next();
    }
    await ctx.reply(MESSAGES.common.enterInterviewTime, { parse_mode: 'HTML' });
  },
  // Шаг 7: Финальная оплата
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (fullResumeScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.payFinal
    ) {
      // Пересчитываем цену перед расчётом финальной оплаты
      let price = (ctx.session as any).price;
      let tariff = (ctx.session as any).tariff;
      console.log(
        "DEBUG (final payment): tariff:",
        tariff,
        "price:",
        price,
        "upsell:",
        (ctx.session as any).upsell,
      );
      if (!tariff || !["junior", "pro", "lead"].includes(tariff)) {
        console.error("Ошибка: тариф не выбран или невалиден (финал)", tariff);
        await ctx.reply(
          "Ошибка: тариф не выбран. Пожалуйста, начните заказ заново и выберите тариф.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      if (typeof price !== "number" || isNaN(price)) {
        // Пересчёт для fullResumeScene
        if (tariff === "junior") price = PRICE_FULL_JUNIOR;
        else if (tariff === "pro") price = PRICE_FULL_PRO;
        else if (tariff === "lead") price = PRICE_FULL_LEAD;
        // Можно добавить доп. опции, если они есть
        if (
          (ctx.session as any).upsell &&
          typeof PRICE_UPSELL_VIDEO === "number"
        ) {
          price += PRICE_UPSELL_VIDEO;
        }
      }
      if (typeof price !== "number" || isNaN(price)) {
        console.error(
          "Ошибка: цена не определена даже после пересчёта (финал)",
          tariff,
          price,
        );
        await ctx.reply(
          "Ошибка: цена услуги не задана. Пожалуйста, обратитесь к администратору.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      (ctx.session as any).price = price;
      const rest = Math.ceil(price / 2);
      if (isNaN(rest)) {
        console.error(
          "Ошибка: сумма финальной оплаты не определена или не число",
          price,
        );
        await ctx.reply(
          "Ошибка: сумма финальной оплаты не задана. Пожалуйста, обратитесь к администратору.",
          { parse_mode: 'HTML' }
        );
        return;
      }
      await ctx.reply(
        MESSAGES.fullResume.finalPaymentInstructions(rest),
        { ...Markup.keyboard([[MESSAGES.buttons.attachReceiptFinal]]).resize(), parse_mode: 'HTML' }
      );
      return ctx.wizard.next();
    }
    await ctx.reply(MESSAGES.common.paySecondPart, { parse_mode: 'HTML' });
  },
  // Шаг 8: Загрузка финального чека
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && isCommand(ctx.message.text)) {
      console.log(`[SCENE] Пользователь ${ctx.from?.id} начал новую команду (fullResumeScene)`);
      await ctx.reply("Вы начали новую команду. Возвращаю в главное меню.", { parse_mode: 'HTML' });
      await ctx.scene.leave();
      await ctx.scene.enter("mainMenu");
      return;
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === MESSAGES.buttons.attachReceiptFinal
    ) {
      await ctx.reply(MESSAGES.exampleResume.attachReceipt, { parse_mode: 'HTML' });
      return;
    }
    if (ctx.message && "photo" in ctx.message) {
      if (
        isFileTooLarge(
          ctx.message.photo[ctx.message.photo.length - 1].file_size || 0,
          50,
        )
      ) {
        await ctx.reply("Файл слишком большой. Максимальный размер — 50 МБ.", { parse_mode: 'HTML' });
        return;
      }
      (ctx.session as any).finalReceiptFileId =
        ctx.message.photo[ctx.message.photo.length - 1].file_id;
      await ctx.reply(
        MESSAGES.fullResume.orderCompleted,
        Markup.removeKeyboard(),
      );
      // Уведомление админу о полной оплате
      const adminMsg = MESSAGES.fullResume.adminPaymentNotification(
        (ctx.session as any).orderId,
        ctx.from?.first_name || "",
        ctx.from?.username || "",
        (ctx.session as any).userId,
        (ctx.session as any).tariff,
      );
      await ctx.telegram.sendPhoto(
        ADMIN_CHAT_ID,
        (ctx.session as any).finalReceiptFileId,
        {
          caption: adminMsg,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📂 Отправить файл",
                  callback_data: `send_result_${(ctx.session as any).orderId}_${(ctx.session as any).userId}`,
                },
              ],
            ],
          },
        },
      );
      await sendAdminEmail(
        `Полная оплата №${(ctx.session as any).orderId}`,
        adminMsg,
      );
      return ctx.scene.leave();
    }
    await ctx.reply(MESSAGES.common.attachReceipt, { parse_mode: 'HTML' });
  },
);

export {};
