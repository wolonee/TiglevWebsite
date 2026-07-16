import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
type ContactItem = { icon: LucideIcon; title: string; lines: { text: string; href?: string }[] };
const items: ContactItem[] = [
  { icon: MapPin, title: "Адрес", lines: [{ text: "Тольятти, Офицерская ул. 46, ГСК 66" }] },
  { icon: Phone, title: "Телефон", lines: [{ text: "+7 (8482) 750-750", href: "tel:+78482750750" }, { text: "8-800-500-0015", href: "tel:88005000015" }] },
  { icon: Clock, title: "Режим работы", lines: [{ text: "Пн–Пт: 9:00 — 18:00" }, { text: "Сб: 9:00 — 17:00" }, { text: "Вс: 10:00 — 14:00" }] },
  { icon: MessageCircle, title: "Мессенджер", lines: [{ text: "ВКонтакте", href: "https://vk.com/tiglev" }] },
  { icon: Mail, title: "E-mail", lines: [{ text: "tiglev2013@yandex.ru", href: "mailto:tiglev2013@yandex.ru" }] },
];
export default function ContactList() { return <div className="space-y-6">{items.map(item => <div key={item.title} className="flex gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><item.icon size={21}/></span><div><h3 className="mb-1 text-sm font-semibold text-dark">{item.title}</h3>{item.lines.map(line => line.href ? <a key={line.text} href={line.href} className="block text-sm text-gray-text hover:text-primary">{line.text}</a> : <p key={line.text} className="text-sm text-gray-text">{line.text}</p>)}</div></div>)}</div>; }
