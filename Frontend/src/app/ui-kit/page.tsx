"use client";

import { useState } from "react";
import CarCard from "@/components/CarCard";
import CarDealPanel from "@/components/CarDealPanel";
import CarSpecs from "@/components/CarSpecs";
import type { Car } from "@/data/cars";
import Button, { IconButton } from "@/components/ui/Button";
import CheckRow from "@/components/ui/CheckRow";
import Counter from "@/components/ui/Counter";
import { Field, FieldLabel, TextArea, TextField } from "@/components/ui/Field";
import Badge from "@/components/ui/Badge";
import Note from "@/components/ui/Note";
import Panel from "@/components/ui/Panel";
import Toggle from "@/components/ui/Toggle";
import { colorOf, markOf } from "@/components/messengerMarks";
import Segmented from "@/components/ui/Segmented";
import Select from "@/components/ui/Select";

/**
 * Витрина UI-кита: /ui-kit
 *
 * Нужна не для красоты. Одни и те же ошибки повторялись потому, что каждый
 * контрол писался заново по месту: у одного своё кольцо фокуса, у другого свои
 * отступы, у третьего системный `<select>`. Здесь всё лежит рядом, и расхождение
 * видно сразу — до того, как попадёт в каталог.
 *
 * Правило: новый контрол сначала появляется здесь, потом используется в проекте.
 */

const BRANDS = [
  { value: "kia", label: "KIA", count: 11903 },
  { value: "hyundai", label: "Hyundai", count: 10834 },
  { value: "bmw", label: "BMW", count: 7813 },
  { value: "mercedes-benz", label: "Mercedes-Benz", count: 7078 },
  { value: "volkswagen", label: "Volkswagen", count: 6670 },
];

const COLORS = [
  { value: "#FFFFFF", label: "Белый", count: 30611 },
  { value: "#000000", label: "Черный", count: 23212 },
  { value: "#C1C1C1", label: "Серый", count: 14618 },
  { value: "multi", label: "Комбинированный", count: 5610 },
];

/** Две карточки: своя машина в наличии и импортная под заказ — оба состояния метки. */
const S3 = "https://s3-api.carclick.ru/s3-carclick";
const gallery = (url: string, count: number) =>
  Array.from({ length: count }, () => ({ url, position: { x: 50, y: 50 } }));

const IMPORTED: Car = {
  id: "kit-imported", source: "carclick",
  brand: "Land Rover", model: "Discovery", year: 2024,
  price: 9_780_826, mileage: 24_700,
  image: `${S3}/storage/parsing/encar/5474760.webp`,
  images: gallery(`${S3}/storage/parsing/encar/5474760.webp`, 8),
  bodyType: "Внедорожник", engine: "бензин", fuel: "бензин",
  power: "300", engineVolume: "3.0 л", transmission: "автомат", drive: "4WD",
  country: "Южная Корея", deliveryTime: 45, condition: "used",
};

const OWN: Car = {
  id: "kit-own", source: "own",
  brand: "KIA", model: "Sorento", year: 2017,
  price: 2_850_000, mileage: 118_000,
  image: `${S3}/scraped/che168/42619e76c11f7d018c701487f280e0cf.webp`,
  images: gallery(`${S3}/scraped/che168/42619e76c11f7d018c701487f280e0cf.webp`, 10),
  bodyType: "Кроссовер", engine: "Бензин", fuel: "Бензин",
  power: "249", engineVolume: "3.3 л", transmission: "Автомат", drive: "Полный",
  condition: "used",
};

const Section = ({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) => (
  <section className="border-t border-gray-border py-8 first:border-t-0">
    <h2 className="text-base font-bold text-dark">{title}</h2>
    {note ? <p className="mt-1 max-w-[70ch] text-sm text-gray-text">{note}</p> : null}
    <div className="mt-4">{children}</div>
  </section>
);

export default function UiKitPage() {
  const [brand, setBrand] = useState("");
  const [year, setYear] = useState("");
  const [avail, setAvail] = useState("");
  const [checks, setChecks] = useState<string[]>(["#000000"]);
  const [live, setLive] = useState(true);
  const [muted, setMuted] = useState(false);

  const toggle = (value: string) =>
    setChecks((list) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]));

  return (
    <main className="min-h-screen bg-gray-bg py-10">
      <div className="shell max-w-4xl">
        <header className="mb-6">
          <span className="eyebrow">TIGLEV</span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-dark">UI-кит</h1>
          <p className="mt-2 max-w-[70ch] text-sm text-gray-text">
            Все контролы проекта в одном месте. Новый контрол сначала появляется здесь,
            потом идёт в страницы — иначе каждый экран обрастает своими отступами,
            своим фокусом и своими цветами.
          </p>
        </header>

        <div className="rounded-2xl border border-gray-border bg-white px-6">
          <Section
            title="Кнопки"
            note="Красная — целевое действие на экране, оно одно. Тёмная — важное, но не главное. Остальные вспомогательные."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Показать 309</Button>
              <Button variant="secondary">Подробнее</Button>
              <Button variant="outline">Все параметры</Button>
              <Button variant="ghost">Сбросить</Button>
              <Button variant="link">Показать ещё 52</Button>
              <Button variant="primary" disabled>Недоступна</Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button size="sm">Мелкая</Button>
              <Button size="md">Обычная</Button>
              <Button size="lg">Крупная</Button>
            </div>
          </Section>

          <Section
            title="Фокус"
            note="Пройдитесь по странице через Tab. Кольцо должно быть ровно одно и одинаковое везде. Раньше здесь накладывались outline, box-shadow и красная рамка — получалось три обводки сразу."
          >
            <div className="flex flex-wrap gap-3">
              <TextField label="Обычное поле" placeholder="Нажмите Tab" className="max-w-[220px]" />
              <Button variant="outline">Кнопка</Button>
              <Select options={BRANDS} value={brand} onChange={setBrand} ariaLabel="Фокус-пример" className="max-w-[220px]" />
            </div>
          </Section>

          <Section
            title="Поля ввода"
            note="Одна высота (40px), одно скругление, одна рамка. Пара «от / до» — стандартный вид для диапазонов."
          >
            <div className="grid max-w-xl grid-cols-2 gap-3.5">
              <Field label="Название">
                <TextField placeholder="Введите текст" />
              </Field>
              <div className="flex flex-col">
                <FieldLabel>Цена, ₽</FieldLabel>
                <div className="flex gap-2">
                  <TextField placeholder="от" inputMode="numeric" label="Цена от" />
                  <TextField placeholder="до" inputMode="numeric" label="Цена до" />
                </div>
              </div>
            </div>
          </Section>

          <Section
            title="Выпадающий список"
            note="Свой, а не системный: системный нельзя оформить и в нём некуда положить счётчики. Работает с клавиатуры — стрелки, Enter, Escape. Поиск включается сам, когда вариантов много."
          >
            <div className="grid max-w-xl grid-cols-2 gap-3.5">
              <Field label="Марка">
                <Select options={BRANDS} value={brand} onChange={setBrand} placeholder="Любая" ariaLabel="Марка" />
              </Field>
              <Field label="Год">
                <Select
                  options={[2026, 2025, 2024, 2023].map((y) => ({ value: String(y), label: String(y) }))}
                  value={year}
                  onChange={setYear}
                  placeholder="Любой"
                  ariaLabel="Год"
                />
              </Field>
              <Field label="Выключенный">
                <Select options={[]} value="" onChange={() => {}} disabled disabledHint="Сначала марка" ariaLabel="Выключенный" />
              </Field>
            </div>
          </Section>

          <Section
            title="Переключатель"
            note="Только на два-три коротких варианта. Цифры внутрь не ставим: сегменты делят ширину поровну, число не влезает и переносится на вторую строку."
          >
            <div className="max-w-sm">
              <Segmented
                ariaLabel="Наличие"
                value={avail}
                onChange={setAvail}
                options={[
                  { value: "", label: "Все" },
                  { value: "instock", label: "В наличии" },
                  { value: "order", label: "Под заказ" },
                ]}
              />
            </div>
          </Section>

          <Section
            title="Список с галочками"
            note="Число справа обязательно: пользователь сразу видит, что вариант даст 28 машин, и не тратит клик. Образец цвета — вместо описания словами."
          >
            <div className="flex max-w-xs flex-col gap-1.5">
              {COLORS.map((item) => (
                <CheckRow
                  key={item.value}
                  label={item.label}
                  count={item.count}
                  swatch={item.value}
                  checked={checks.includes(item.value)}
                  onChange={() => toggle(item.value)}
                />
              ))}
              <CheckRow label="Вложенная строка (модель)" compact checked={false} onChange={() => {}} count={870} />
            </div>
          </Section>

          <Section
            title="Рубильник"
            note="Для админки: включает и выключает целый кусок сайта. Не галочка — та означает «выбрал из списка», а здесь смысл другой. Цвет тёмный, потому что красная кнопка на экране одна и это «Сохранить»."
          >
            <div className="space-y-3">
              <Toggle checked={live} onChange={setLive} label="Telegram" hint="Кнопка видна покупателю на карточке машины." />
              <Toggle checked={muted} onChange={setMuted} label="VK" hint={muted ? undefined : "выключен — на сайте кнопки нет"} />
              <Toggle checked disabled onChange={() => {}} label="Недоступен" hint="Состояние без права на изменение." />
            </div>
          </Section>

          <Section
            title="Метка состояния"
            note="Статус заявки. Синяя — не просмотрена, янтарная — в работе, зелёная — закрыта, без заливки — убрана из работы. Красной здесь нет намеренно: красный занят целевым действием, и метка рядом с кнопкой читалась бы как вторая кнопка. Ничего мигающего — админку держат открытой часами."
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="new">Новая</Badge>
              <Badge tone="progress">В работе</Badge>
              <Badge tone="done">Завершена</Badge>
              <Badge tone="muted">Архив</Badge>
            </div>
          </Section>

          <Section
            title="Знаки мессенджеров"
            note="Один набор на кнопки у покупателя и на заготовки в админке. У Telegram и WhatsApp знак рисуется, у VK и MAX знак — это сами буквы названия. Незнакомому сервису достаётся название и нейтральный цвет: кривой самодельный логотип узнаётся хуже честной надписи."
          >
            <div className="flex flex-wrap items-center gap-2">
              {[["telegram", "Telegram"], ["max", "MAX"], ["vk", "VK"], ["whatsapp", "WhatsApp"], ["viber", "Viber"]].map(([id, label]) => (
                <span
                  key={id}
                  style={{ color: colorOf(id) }}
                  className="inline-flex h-11 w-24 items-center justify-center rounded-lg border border-gray-border bg-white text-sm font-bold"
                >
                  {markOf(id, label)}
                </span>
              ))}
            </div>
          </Section>

          <Section
            title="Кнопка-знак"
            note="Удалить строку, переставить выше. Всегда с подписью для читалки экрана и всегда одной ширины: иначе ряд иконок пляшет."
          >
            <div className="flex items-center gap-1">
              <IconButton label="Выше">↑</IconButton>
              <IconButton label="Ниже">↓</IconButton>
              <IconButton label="Удалить">✕</IconButton>
              <IconButton label="Недоступно" disabled>✕</IconButton>
            </div>
          </Section>

          <Section
            title="Многострочное поле"
            note="Размер не тянется мышью: растянутое поле ломает сетку соседних колонок. Высота задаётся числом строк."
          >
            <TextArea
              rows={3}
              defaultValue={"Подберём и привезём автомобиль из Кореи, Китая и Европы.\nПод ключ, с растаможкой и доставкой до Тольятти."}
            />
          </Section>

          <Section
            title="Блок и сообщения"
            note="Белый блок с рамкой — основа экранов админки. Сообщения к нему трёх тонов и ни одного своего цвета по месту."
          >
            <Panel
              title="Каналы связи"
              note="Кнопки под ценой на карточке машины."
              aside={<span className="text-sm text-gray-text">3 шт.</span>}
            >
              <div className="space-y-2">
                <Note tone="success">Сохранено. На сайте уже применилось.</Note>
                <Note tone="warning">Ни один канал не включён — написать напрямую покупатель не сможет.</Note>
                <Note>Переход в мессенджер приходит уведомлением в Telegram-бот.</Note>
              </div>
            </Panel>
          </Section>

          <Section title="Счётчик" note="Сколько фильтров выбрано. Ноль не показывается вовсе.">
            <div className="flex items-center gap-4">
              <Counter value={3} />
              <Counter value={12} />
              <Counter value={7} tone="neutral" />
              <span className="text-sm text-gray-text">← ноль не рисуется: <Counter value={0} /></span>
            </div>
          </Section>

          <Section
            title="Карточка товара"
            note="Слева своя машина: зелёная метка «В наличии в Тольятти» и цена «под ключ». Справа импортная: страна на фото и срок доставки. Словари источников разные («Полный» против «4WD»), карточка приводит их к читаемому виду."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <CarCard car={OWN} />
              <CarCard car={IMPORTED} />
              <CarCard car={{ ...IMPORTED, id: "kit-new", condition: "new", mileage: 0, brand: "Zeekr", model: "001", country: "Китай" }} />
            </div>
            <p className="mt-3 text-sm text-gray-text">
              Третья — новая машина: чип «Новый» и нулевой пробег. Если поля нет в данных,
              ячейка не рисуется вовсе, а не показывает прочерк.
            </p>
          </Section>

          <Section
            title="Блок сделки и заявка"
            note="Страница автомобиля начинается с этого блока — отдельной шапки над галереей нет, она повторяла год и тип кузова. Внутри только про покупку: цена, срок, откуда едет. Пробег, год и мощность — в «Характеристиках», иначе блок превращается во второй список параметров. Телефона нет: звонок требует говорить сейчас, переписку можно продолжить через час. Кредита тоже нет — машины идут через партнёра, и калькулятор обещал бы услугу, которой нет."
          >
            <CarDealPanel car={IMPORTED} priceLegal={10_450_000} />
          </Section>

          <Section
            title="Характеристики"
            note="Плиткой с иконками, а не таблицей: значение крупно, подпись мелко под ним — так же, как в карточке каталога. В таблице на всю ширину подпись и значение расходятся по краям, и глаз каждый раз проходит всю строку."
          >
            <CarSpecs car={IMPORTED} />
          </Section>

          <Section title="Цвета" note="Красный — только акцент и целевое действие. Всё остальное — нейтрали.">
            <div className="flex flex-wrap gap-3">
              {[
                ["primary", "#C41E24", "акцент, целевое действие"],
                ["primary-dark", "#9B171C", "наведение, фокус"],
                ["dark", "#0F172A", "основной текст"],
                ["gray-text", "#64748B", "второстепенный текст"],
                ["gray-border", "#E2E8F0", "рамки"],
                ["gray-bg", "#F8FAFC", "фон блоков"],
              ].map(([name, hex, note]) => (
                <div key={name} className="w-40">
                  <div className="h-12 rounded-lg border border-gray-border" style={{ background: hex }} />
                  <p className="mt-1.5 text-xs font-semibold text-dark">{name}</p>
                  <p className="text-[11px] text-gray-text">{hex}</p>
                  <p className="text-[11px] text-gray-text">{note}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
