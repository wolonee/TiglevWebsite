"use client";

import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSiteContent } from "./SiteContentProvider";

type ContactItem = { icon: LucideIcon; title: string; lines: { text: string; href?: string }[] };

export default function ContactList() {
  const { company } = useSiteContent();

  // Пустые разделы не показываем: строка «E-mail» без адреса выглядит поломкой.
  const items: ContactItem[] = [
    { icon: MapPin, title: "Адрес", lines: company.address ? [{ text: company.address }] : [] },
    { icon: Phone, title: "Телефон", lines: company.phones.map(({ label, href }) => ({ text: label, href })) },
    { icon: Clock, title: "Режим работы", lines: company.workHours.map((text) => ({ text })) },
    { icon: MessageCircle, title: "Мессенджер", lines: company.vkUrl ? [{ text: "ВКонтакте", href: company.vkUrl }] : [] },
    { icon: Mail, title: "E-mail", lines: company.email.label ? [{ text: company.email.label, href: company.email.href }] : [] },
  ].filter((item) => item.lines.length > 0);

  return <div className="space-y-6">{items.map(item => <div key={item.title} className="flex gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><item.icon size={21}/></span><div><h3 className="mb-1 text-sm font-semibold text-dark">{item.title}</h3>{item.lines.map(line => line.href ? <a key={line.text} href={line.href} className="block text-sm text-gray-text hover:text-primary">{line.text}</a> : <p key={line.text} className="text-sm text-gray-text">{line.text}</p>)}</div></div>)}</div>;
}
