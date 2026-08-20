"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import Button, { IconButton } from "@/components/ui/Button";
import { CONTROL_BASE, FieldLabel, TextArea } from "@/components/ui/Field";
import Note from "@/components/ui/Note";
import Panel from "@/components/ui/Panel";
import { DEFAULT_CONTENT, type NavLink, type SiteContent } from "@/data/siteContent";

/**
 * Редактор текстов и контактов сайта.
 *
 * Что здесь важно: это не «настройки», а прямая правка того, что видит
 * посетитель. Поэтому у каждого поля написано, где оно появится, а у полей с
 * подвохом (цифры первого экрана, шаблон ссылки) сказано, чем обернётся
 * изменение. Иначе первое же редактирование делается вслепую.
 *
 * Сохранение — одной кнопкой на весь документ, а не по разделам: тексты правят
 * пачкой, и пять кнопок «Сохранить» на экране означают пять шансов уйти,
 * забыв нажать одну из них.
 */

type Editable = SiteContent;

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <FieldLabel>{label}</FieldLabel>
    {children}
    {hint ? <p className="mt-1.5 text-xs leading-relaxed text-gray-text">{hint}</p> : null}
  </div>
);

/** Список ссылок: меню в шапке и колонки подвала устроены одинаково. */
function LinkList({
  links,
  onChange,
}: {
  links: NavLink[];
  onChange: (next: NavLink[]) => void;
}) {
  const patch = (index: number, changes: Partial<NavLink>) =>
    onChange(links.map((link, i) => (i === index ? { ...link, ...changes } : link)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {links.map((link, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <input
            className={`${CONTROL_BASE} w-[minmax(0,1fr)] flex-1`}
            value={link.label}
            placeholder="Подпись"
            onChange={(event) => patch(index, { label: event.target.value })}
          />
          <input
            className={`${CONTROL_BASE} flex-1 font-mono text-[13px]`}
            value={link.href}
            placeholder="/sell"
            onChange={(event) => patch(index, { href: event.target.value })}
          />
          <div className="flex items-center gap-1">
            <IconButton label="Выше" onClick={() => move(index, -1)} disabled={index === 0}>
              <ArrowUp className="h-4 w-4" />
            </IconButton>
            <IconButton label="Ниже" onClick={() => move(index, 1)} disabled={index === links.length - 1}>
              <ArrowDown className="h-4 w-4" />
            </IconButton>
            <IconButton label={`Удалить ${link.label}`} onClick={() => onChange(links.filter((_, i) => i !== index))}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...links, { label: "", href: "/" }])}>
        <Plus className="h-3.5 w-3.5" />
        Добавить пункт
      </Button>
    </div>
  );
}

/** Список простых строк: режим работы. */
function LineList({ lines, onChange, placeholder }: { lines: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {lines.map((line, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            className={CONTROL_BASE}
            value={line}
            placeholder={placeholder}
            onChange={(event) => onChange(lines.map((item, i) => (i === index ? event.target.value : item)))}
          />
          <IconButton label="Удалить строку" onClick={() => onChange(lines.filter((_, i) => i !== index))}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...lines, ""])}>
        <Plus className="h-3.5 w-3.5" />
        Добавить строку
      </Button>
    </div>
  );
}

export default function SiteContentEditor({ initial }: { initial: Editable }) {
  const [content, setContent] = useState<Editable>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "warning"; text: string } | null>(null);

  const set = <K extends keyof Editable>(section: K, changes: Partial<Editable[K]>) => {
    setMessage(null);
    setContent((current) => ({ ...current, [section]: { ...current[section], ...changes } }));
  };

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? `Сервер ответил ${response.status}`);
      setMessage({ tone: "success", text: "Сохранено. На сайте уже применилось." });
    } catch (error) {
      setMessage({ tone: "warning", text: error instanceof Error ? error.message : "Не удалось сохранить" });
    } finally {
      setSaving(false);
    }
  }

  const { header, hero, company, footer } = content;

  return (
    <div className="space-y-5">
      <Panel
        title="Шапка"
        note="Меню и кнопка в верхней строке на всех страницах. Телефон в шапке берётся из раздела «Компания»."
      >
        <Row label="Пункты меню" hint="Адрес: «/sell» — страница сайта, «/#catalog» — якорь на главной.">
          <LinkList links={header.nav} onChange={(nav) => set("header", { nav })} />
        </Row>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Row label="Кнопка справа">
            <input
              className={CONTROL_BASE}
              value={header.ctaLabel}
              onChange={(event) => set("header", { ctaLabel: event.target.value })}
            />
          </Row>
          <Row label="Куда ведёт кнопка">
            <input
              className={`${CONTROL_BASE} font-mono text-[13px]`}
              value={header.ctaHref}
              onChange={(event) => set("header", { ctaHref: event.target.value })}
            />
          </Row>
        </div>
      </Panel>

      <Panel title="Первый экран" note="То, что человек видит до прокрутки на главной странице.">
        <div className="space-y-4">
          <Row label="Плашка над заголовком" hint="Пустое поле — плашки не будет.">
            <input
              className={CONTROL_BASE}
              value={hero.badge}
              onChange={(event) => set("hero", { badge: event.target.value })}
            />
          </Row>

          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Заголовок, начало" hint="Белым.">
              <input
                className={CONTROL_BASE}
                value={hero.titleLead}
                onChange={(event) => set("hero", { titleLead: event.target.value })}
              />
            </Row>
            <Row label="Заголовок, продолжение" hint="Красным градиентом.">
              <input
                className={CONTROL_BASE}
                value={hero.titleAccent}
                onChange={(event) => set("hero", { titleAccent: event.target.value })}
              />
            </Row>
          </div>

          <Row
            label="Описание"
            hint="«{catalogSize}» подставится числом машин в каталоге — так строка не устареет."
          >
            <TextArea
              rows={3}
              value={hero.description}
              onChange={(event) => set("hero", { description: event.target.value })}
            />
          </Row>

          <div>
            <FieldLabel>Цифры под описанием</FieldLabel>
            {hero.stats.length === 0 ? (
              <Note>
                Сейчас считаются из каталога: количество машин, число стран, сколько новых.
                Такие цифры не устаревают. Заполните вручную — эта связь пропадёт, и обновлять
                их придётся самому.
              </Note>
            ) : (
              <div className="space-y-2">
                {hero.stats.map((stat, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      className={`${CONTROL_BASE} w-32`}
                      value={stat.value}
                      placeholder="84 000+"
                      onChange={(event) => set("hero", {
                        stats: hero.stats.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)),
                      })}
                    />
                    <input
                      className={CONTROL_BASE}
                      value={stat.label}
                      placeholder="автомобилей в каталоге"
                      onChange={(event) => set("hero", {
                        stats: hero.stats.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)),
                      })}
                    />
                    <IconButton
                      label="Удалить цифру"
                      onClick={() => set("hero", { stats: hero.stats.filter((_, i) => i !== index) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={hero.stats.length >= 4}
                onClick={() => set("hero", { stats: [...hero.stats, { value: "", label: "" }] })}
              >
                <Plus className="h-3.5 w-3.5" />
                Своя цифра
              </Button>
              {hero.stats.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => set("hero", { stats: [] })}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Вернуть расчёт по каталогу
                </Button>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Компания и контакты"
        note="Одни и те же данные показываются в шапке, подвале, на странице контактов и в карточке своей машины."
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Название">
              <input
                className={CONTROL_BASE}
                value={company.name}
                onChange={(event) => set("company", { name: event.target.value })}
              />
            </Row>
            <Row label="Адрес" hint="Показывается в подвале и в карточке машины из наличия.">
              <input
                className={CONTROL_BASE}
                value={company.address}
                onChange={(event) => set("company", { address: event.target.value })}
              />
            </Row>
          </div>

          <Row label="О компании" hint="Абзац в подвале.">
            <TextArea
              rows={3}
              value={company.about}
              onChange={(event) => set("company", { about: event.target.value })}
            />
          </Row>

          <Row
            label="Телефоны"
            hint="Первый попадает в шапку и в описание сайта для поиска. Адрес ссылки — «tel:», без пробелов и скобок."
          >
            <div className="space-y-2">
              {company.phones.map((phone, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    className={CONTROL_BASE}
                    value={phone.label}
                    placeholder="8 (800) 500-00-15"
                    onChange={(event) => set("company", {
                      phones: company.phones.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)),
                    })}
                  />
                  <input
                    className={`${CONTROL_BASE} font-mono text-[13px]`}
                    value={phone.href}
                    placeholder="tel:88005000015"
                    onChange={(event) => set("company", {
                      phones: company.phones.map((item, i) => (i === index ? { ...item, href: event.target.value } : item)),
                    })}
                  />
                  <IconButton
                    label="Удалить телефон"
                    onClick={() => set("company", { phones: company.phones.filter((_, i) => i !== index) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => set("company", { phones: [...company.phones, { label: "", href: "tel:" }] })}
              >
                <Plus className="h-3.5 w-3.5" />
                Добавить телефон
              </Button>
            </div>
          </Row>

          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="E-mail">
              <input
                className={CONTROL_BASE}
                value={company.email.label}
                placeholder="tiglev2013@yandex.ru"
                onChange={(event) => set("company", {
                  email: { label: event.target.value, href: `mailto:${event.target.value}` },
                })}
              />
            </Row>
            <Row label="Страница ВКонтакте" hint="Ссылка в подвале и в списке контактов.">
              <input
                className={`${CONTROL_BASE} font-mono text-[13px]`}
                value={company.vkUrl}
                onChange={(event) => set("company", { vkUrl: event.target.value })}
              />
            </Row>
          </div>

          <Row label="Режим работы" hint="Каждая строка — отдельный день или диапазон.">
            <LineList
              lines={company.workHours}
              placeholder="Будние дни: 9:00 — 18:00"
              onChange={(workHours) => set("company", { workHours })}
            />
          </Row>
        </div>
      </Panel>

      <Panel title="Подвал" note="Колонки со ссылками внизу каждой страницы.">
        <div className="space-y-5">
          {footer.sections.map((section, index) => (
            <div key={index} className="rounded-xl border border-gray-border p-4">
              <div className="mb-3 flex items-center gap-2">
                <input
                  className={CONTROL_BASE}
                  value={section.title}
                  placeholder="Заголовок колонки"
                  onChange={(event) => set("footer", {
                    sections: footer.sections.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)),
                  })}
                />
                <IconButton
                  label={`Удалить колонку ${section.title}`}
                  onClick={() => set("footer", { sections: footer.sections.filter((_, i) => i !== index) })}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
              <LinkList
                links={section.links}
                onChange={(links) => set("footer", {
                  sections: footer.sections.map((item, i) => (i === index ? { ...item, links } : item)),
                })}
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={footer.sections.length >= 4}
            onClick={() => set("footer", { sections: [...footer.sections, { title: "", links: [] }] })}
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить колонку
          </Button>
        </div>
      </Panel>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-border bg-white p-4 shadow-sm">
        <Button onClick={save} disabled={saving}>
          {saving ? "Сохраняю…" : "Сохранить"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setMessage(null);
            setContent(DEFAULT_CONTENT);
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Вернуть тексты по умолчанию
        </Button>
        {message && <Note tone={message.tone}>{message.text}</Note>}
      </div>
    </div>
  );
}
