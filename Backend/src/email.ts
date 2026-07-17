import type { Express } from "express";
import { Resend } from "resend";
import { config } from "./config.js";
import type { ContactRequest, SellRequest } from "./telegram.js";

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const row = (label: string, value?: string) => value ? `
  <tr>
    <td style="padding:8px 16px 8px 0;color:#64748b;vertical-align:top">${escapeHtml(label)}</td>
    <td style="padding:8px 0;font-weight:600;color:#0f172a">${escapeHtml(value)}</td>
  </tr>` : "";

const buildHtml = (data: SellRequest) => `<!doctype html>
<html lang="ru">
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px">
      <div style="overflow:hidden;border:1px solid #e2e8f0;border-radius:16px;background:#fff">
        <div style="padding:24px;background:#c41e24;color:#fff">
          <div style="font-size:13px;letter-spacing:.12em">TIGLEV.COM</div>
          <h1 style="margin:8px 0 0;font-size:24px">Новая заявка на выкуп автомобиля</h1>
        </div>
        <div style="padding:24px">
          <h2 style="margin:0 0 8px;font-size:18px">Автомобиль</h2>
          <table style="width:100%;border-collapse:collapse">
            ${row("Марка и модель", data.model)}
            ${row("Год выпуска", data.year)}
            ${row("Тип кузова", data.body)}
            ${row("Двигатель", data.engine)}
            ${row("Руль", data.wheel)}
            ${row("Коробка передач", data.transmission)}
            ${row("Пробег", data.mileage ? `${data.mileage} км` : undefined)}
          </table>
          <h2 style="margin:24px 0 8px;font-size:18px">Контактные данные</h2>
          <table style="width:100%;border-collapse:collapse">
            ${row("Имя", `${data.firstName} ${data.lastName}`)}
            ${row("Телефон", data.phone)}
            ${row("E-mail", data.email)}
          </table>
        </div>
      </div>
    </div>
  </body>
</html>`;

export async function sendSellRequestEmail(data: SellRequest, photos: Express.Multer.File[]) {
  if (!config.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  const resend = new Resend(config.RESEND_API_KEY);
  const { data: result, error } = await resend.emails.send({
    from: config.EMAIL_FROM,
    to: config.EMAIL_RECIPIENT,
    subject: `Новая заявка: ${data.model}, ${data.year}`,
    html: buildHtml(data),
    replyTo: data.email || undefined,
    attachments: photos.map((photo) => ({ filename: photo.originalname, content: photo.buffer })),
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  return { id: result?.id };
}

export async function sendContactRequestEmail(data: ContactRequest) {
  if (!config.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  const resend = new Resend(config.RESEND_API_KEY);
  const { data: result, error } = await resend.emails.send({
    from: config.EMAIL_FROM,
    to: config.EMAIL_RECIPIENT,
    subject: `Новая заявка от ${data.name}`,
    html: `<!doctype html>
      <html lang="ru">
        <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
          <div style="max-width:640px;margin:0 auto;padding:32px 16px">
            <div style="overflow:hidden;border:1px solid #e2e8f0;border-radius:16px;background:#fff">
              <div style="padding:24px;background:#c41e24;color:#fff">
                <div style="font-size:13px;letter-spacing:.12em">TIGLEV.COM</div>
                <h1 style="margin:8px 0 0;font-size:24px">Новая заявка с формы «Написать нам»</h1>
              </div>
              <div style="padding:24px">
                <table style="width:100%;border-collapse:collapse">
                  ${row("Имя", data.name)}
                  ${row("Телефон", data.phone)}
                  ${row("Сообщение", data.message)}
                  ${row("Страница", data.source)}
                </table>
              </div>
            </div>
          </div>
        </body>
      </html>`,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  return { id: result?.id };
}
