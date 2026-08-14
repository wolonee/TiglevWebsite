"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import Button, { IconButton } from "@/components/ui/Button";
import { CONTROL_BASE, FieldLabel } from "@/components/ui/Field";
import Note from "@/components/ui/Note";
import Panel from "@/components/ui/Panel";
import Toggle from "@/components/ui/Toggle";
import { buildHref, type MessengerChannel } from "@/data/messengers";

/**
 * Управление каналами связи.
 *
 * Что здесь важно понимать администратору: этот список — единственное, что
 * видит покупатель под кнопкой «Оставить заявку». Пустой список означает, что
 * связаться напрямую нельзя, останется только форма заявки.
 *
 * Выключение сделано галочкой, а не удалением: с сервисом обычно расстаются
 * временно, и ник со ссылкой стоит сохранить, чтобы не искать заново.
 */

/** Заготовки: у известных сервисов адрес чата строится по своим правилам. */
const PRESETS: { id: string; label: string; urlTemplate: string; prefillsMessage: boolean; hint: string }[] = [
  { id: "telegram", label: "Telegram", urlTemplate: "https://t.me/{handle}?text={message}", prefillsMessage: true, hint: "ник без @" },
  { id: "vk", label: "VK", urlTemplate: "https://vk.me/{handle}", prefillsMessage: false, hint: "короткое имя страницы" },
  { id: "whatsapp", label: "WhatsApp", urlTemplate: "https://wa.me/{handle}?text={message}", prefillsMessage: true, hint: "номер: 79991234567" },
  { id: "max", label: "Max", urlTemplate: "https://max.ru/{handle}", prefillsMessage: false, hint: "имя профиля" },
  { id: "custom", label: "Другой сервис", urlTemplate: "https://example.com/{handle}", prefillsMessage: false, hint: "" },
];

const SAMPLE = "Здравствуйте! Интересует KIA Sorento 2024 г.";

export default function MessengerSettings({ initial }: { initial: MessengerChannel[] }) {
  const [channels, setChannels] = useState<MessengerChannel[]>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const patch = (index: number, changes: Partial<MessengerChannel>) => {
    setMessage(null);
    setChannels((list) => list.map((channel, i) => (i === index ? { ...channel, ...changes } : channel)));
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= channels.length) return;
    setMessage(null);
    setChannels((list) => {
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (index: number) => {
    setMessage(null);
    setChannels((list) => list.filter((_, i) => i !== index));
  };

  const add = (preset: (typeof PRESETS)[number]) => {
    setMessage(null);
    setChannels((list) => {
      // Один сервис — одна кнопка: два «Telegram» подряд покупателя запутают,
      // да и бэкенд отклонит повторный идентификатор.
      const id = list.some((channel) => channel.id === preset.id)
        ? `${preset.id}-${list.length + 1}`
        : preset.id;
      return [...list, {
        id,
        label: preset.label,
        handle: "",
        urlTemplate: preset.urlTemplate,
        prefillsMessage: preset.prefillsMessage,
        enabled: false,
      }];
    });
  };

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/messengers", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channels }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? `Сервер ответил ${response.status}`);
      setChannels(result.channels ?? channels);
      setMessage({ tone: "ok", text: "Сохранено. На сайте уже применилось." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Не удалось сохранить" });
    } finally {
      setSaving(false);
    }
  }

  const activeCount = channels.filter((channel) => channel.enabled && channel.handle.trim()).length;

  return (
    <div className="space-y-5">
      <Panel
        title="Каналы на карточке машины"
        aside={
          <span className="text-sm text-gray-text">
            Показывается покупателю: {activeCount ? `${activeCount} шт.` : "ничего"}
          </span>
        }
      >
        {activeCount === 0 && (
          <Note tone="warning" className="mb-4">
            Ни один канал не включён — под кнопкой заявки на карточке машины будет
            пусто, написать напрямую покупатель не сможет.
          </Note>
        )}

        <div className="space-y-3">
          {channels.map((channel, index) => (
            <article
              key={channel.id}
              className={`rounded-xl border p-4 transition-colors ${
                channel.enabled ? "border-gray-border bg-white" : "border-dashed border-gray-border bg-gray-bg/50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Toggle
                  checked={channel.enabled}
                  onChange={(next) => patch(index, { enabled: next })}
                  label={channel.label || channel.id}
                  hint={channel.enabled ? undefined : "выключен — на сайте кнопки нет"}
                />

                <div className="flex items-center gap-1">
                  <IconButton label="Выше" onClick={() => move(index, -1)} disabled={index === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Ниже" onClick={() => move(index, 1)} disabled={index === channels.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </IconButton>
                  <IconButton label={`Удалить ${channel.label}`} onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                  <FieldLabel>Название на кнопке</FieldLabel>
                  <input
                    className={CONTROL_BASE}
                    value={channel.label}
                    onChange={(event) => patch(index, { label: event.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel>Ник или номер</FieldLabel>
                  <input
                    className={CONTROL_BASE}
                    value={channel.handle}
                    placeholder="например, NARCI33IST"
                    onChange={(event) => patch(index, { handle: event.target.value })}
                  />
                </div>
              </div>

              <div className="mt-3">
                <FieldLabel>Шаблон ссылки</FieldLabel>
                <input
                  className={`${CONTROL_BASE} font-mono text-[13px]`}
                  value={channel.urlTemplate}
                  onChange={(event) => patch(index, { urlTemplate: event.target.value })}
                />
                <p className="mt-1.5 text-xs text-gray-text">
                  <code>{"{handle}"}</code> — ник из поля выше, <code>{"{message}"}</code> — готовый текст о машине.
                </p>
              </div>

              <div className="mt-3">
                <Toggle
                  checked={channel.prefillsMessage}
                  onChange={(next) => patch(index, { prefillsMessage: next })}
                  label="Подставляет текст в поле ввода"
                  hint="Так умеет только Telegram. Остальным кладём текст в буфер обмена."
                />
              </div>

              {channel.handle.trim() && (
                <p className="mt-3 truncate text-xs text-gray-text">
                  Ссылка:{" "}
                  <a
                    href={buildHref(channel, SAMPLE)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {buildHref(channel, SAMPLE).slice(0, 90)}
                  </a>
                </p>
              )}
            </article>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-text">Добавить:</span>
          {PRESETS.map((preset) => (
            <Button key={preset.id} variant="outline" size="sm" onClick={() => add(preset)}>
              <Plus className="h-3.5 w-3.5" />
              {preset.label}
            </Button>
          ))}
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Сохраняю…" : "Сохранить"}
        </Button>
        {message && (
          <Note tone={message.tone === "ok" ? "success" : "warning"}>{message.text}</Note>
        )}
      </div>
    </div>
  );
}
