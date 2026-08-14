/**
 * Тексты и контакты сайта, которые правит администратор.
 *
 * До этого всё лежало в коде: заголовок первого экрана, пункты меню, телефоны
 * и режим работы. Поменять телефон означало правку исходников и деплой, а
 * значит — разработчика на каждую мелочь.
 *
 * Значения по умолчанию здесь не «примерные»: это ровно то, что стояло в
 * коде. Они же остаются запасным вариантом, если бэкенд не ответил, — сайт
 * должен показывать телефон даже в этом случае.
 */

export type NavLink = { href: string; label: string };
export type Stat = { value: string; label: string };
export type Phone = { label: string; href: string };

export type SiteContent = {
  header: {
    nav: NavLink[];
    /** Красная кнопка справа в шапке. */
    ctaLabel: string;
    ctaHref: string;
  };
  hero: {
    /** Плашка над заголовком: «Тольятти — с 2009 года». */
    badge: string;
    /** Первая часть заголовка, обычным цветом. */
    titleLead: string;
    /** Вторая часть, красным градиентом. */
    titleAccent: string;
    description: string;
    /**
     * Цифры под описанием. Пустой список — считать из каталога.
     *
     * По умолчанию именно так: «41 911 автомобилей» берётся из данных и не
     * устаревает. Заполненный вручную список эту связь разрывает, поэтому в
     * админке об этом сказано прямо.
     */
    stats: Stat[];
  };
  company: {
    name: string;
    /** Абзац о компании в подвале. */
    about: string;
    address: string;
    phones: Phone[];
    email: { label: string; href: string };
    workHours: string[];
    /** Публичная страница во ВКонтакте — она же ссылка в подвале и контактах. */
    vkUrl: string;
  };
  footer: {
    sections: { title: string; links: NavLink[] }[];
  };
};

export const DEFAULT_CONTENT: SiteContent = {
  header: {
    nav: [
      { href: "/", label: "Главная" },
      { href: "/#catalog", label: "Каталог" },
      { href: "/sell", label: "Продать авто" },
      { href: "/import", label: "Авто на заказ" },
    ],
    ctaLabel: "Написать нам",
    ctaHref: "/contacts",
  },
  hero: {
    badge: "Тольятти — с 2009 года",
    // «Авто», а не «Автомобили»: по подсказкам Яндекса «авто из …» дополняется
    // коммерческими запросами (китая, кореи, германии), а «автомобиль из …» —
    // сканвордами и фильмами. Слово выбрано по данным, а не на слух.
    titleLead: "Авто под заказ",
    titleAccent: "из Кореи, Китая и Европы",
    description:
      "{catalogSize} предложений трёх стран в одном каталоге и машины в наличии в Тольятти. Считаем, откуда конкретную модель везти выгоднее.",
    stats: [],
  },
  company: {
    name: "TIGLEV.COM",
    about:
      "Автосалон в Тольятти. Продажа, выкуп и заказ автомобилей с 2009 года. Честные цены и прозрачные сделки.",
    address: "гор. Тольятти, ул. Офицерская, 46",
    phones: [
      { label: "8 (800) 500-00-15", href: "tel:88005000015" },
      { label: "+7 (8482) 750-750", href: "tel:+78482750750" },
    ],
    email: { label: "tiglev2013@yandex.ru", href: "mailto:tiglev2013@yandex.ru" },
    workHours: [
      "Будние дни: 9:00 — 18:00",
      "Суббота: 9:00 — 17:00",
      "Воскресенье: 10:00 — 14:00",
    ],
    vkUrl: "https://vk.com/tiglev",
  },
  footer: {
    sections: [
      {
        title: "Навигация",
        links: [
          { href: "/#catalog", label: "Каталог" },
          { href: "/contacts", label: "Контакты" },
        ],
      },
      {
        title: "Услуги",
        links: [
          { href: "/#catalog", label: "Продажа авто" },
          { href: "/sell", label: "Выкуп авто" },
          { href: "/import", label: "Авто из Европы" },
          { href: "/sell", label: "Оценка авто" },
        ],
      },
    ],
  },
};

/**
 * Достраивает сохранённое до полного документа.
 *
 * Нужно потому, что документ в базе старше кода: добавили поле — у сохранённой
 * записи его нет, и без слияния страница упала бы на `undefined`. Слияние
 * поверхностное по разделам: списки заменяются целиком, иначе удалённый
 * администратором пункт меню возвращался бы из значений по умолчанию.
 */
export function mergeContent(stored: Partial<SiteContent> | null | undefined): SiteContent {
  if (!stored) return DEFAULT_CONTENT;
  return {
    header: { ...DEFAULT_CONTENT.header, ...stored.header },
    hero: { ...DEFAULT_CONTENT.hero, ...stored.hero },
    company: { ...DEFAULT_CONTENT.company, ...stored.company },
    footer: { ...DEFAULT_CONTENT.footer, ...stored.footer },
  };
}
