import Image from "next/image";
import ContactList from "./ContactList";
import ContactForm from "./ContactForm";
import SectionHeading from "./SectionHeading";

const Contacts = ({ hideHeading = false }: { hideHeading?: boolean }) => {
  return (
    <section id="contacts" className="bg-gray-bg py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {!hideHeading && <SectionHeading eyebrow="Контакты" title="Свяжитесь с нами" description="Ответим на любые вопросы и поможем подобрать автомобиль" className="mb-14" />}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="h-full">
            <div className="h-full rounded-2xl border border-gray-border bg-white p-8 lg:p-10">
              <ContactList />
            </div>

          </div>

          <div className="rounded-2xl border border-gray-border bg-white p-8 lg:p-10">
            <ContactForm />
          </div>
        </div>
        <SectionHeading eyebrow="Где нас найти" title="Местоположение" className="mb-10 mt-16" />
        <div className="grid overflow-hidden rounded-[20px] border border-gray-border bg-white lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-0.5 bg-gray-border"><div className="relative col-span-2 aspect-[2/1]"><Image src="/images/autosalon-2.webp" alt="Автосалон TIGLEV.COM — здание" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw"/></div><div className="relative aspect-[4/3]"><Image src="/images/autosalon-1.webp" alt="Автосалон TIGLEV.COM — вид с дороги" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw"/></div><div className="relative aspect-[4/3]"><Image src="/images/autosalon-3.webp" alt="Автосалон TIGLEV.COM — вход" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw"/></div></div>
          <iframe src="https://yandex.ru/map-widget/v1/?text=Тольятти%2C%20Офицерская%20улица%2C%2046&z=16" className="h-full min-h-[420px] w-full self-stretch" title="Карта — расположение автосалона TIGLEV.COM в Тольятти" loading="lazy" />
        </div>
      </div>
    </section>
  );
};

export default Contacts;
