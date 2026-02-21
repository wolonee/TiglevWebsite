"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, Menu, X, MessageCircle } from "lucide-react";

const NAV_LINKS = [
  { href: "#about", label: "О компании" },
  { href: "#catalog", label: "Каталог" },
  { href: "#services", label: "Услуги" },
  { href: "#contacts", label: "Контакты" },
] as const;

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible?.target.id) {
          setActiveSection(`#${visible.target.id}`);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );

    NAV_LINKS.forEach(({ href }) => {
      const el = document.querySelector(href);
      if (el) observer.observe(el);
    });

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const handleMobileToggle = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const navColorClass = isScrolled ? "text-dark-light" : "text-white/80";
  const navActiveColorClass = isScrolled ? "text-primary" : "text-white";

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "border-b border-gray-border/50 bg-white/90 shadow-sm backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-20">
          <a
            href="#"
            className="group flex items-center gap-2.5"
            aria-label="TIGLEV — на главную"
          >
            <img
              src="/logo.svg"
              alt="TIGLEV"
              width={40}
              height={40}
              className="h-10 w-10 transition-transform duration-300 group-hover:scale-105"
            />
            <span
              className={`text-xl font-extrabold tracking-tight transition-colors duration-500 ${
                isScrolled ? "text-dark" : "text-white"
              }`}
            >
              TIGLEV
            </span>
          </a>

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Основная навигация"
          >
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-300 hover:text-primary ${
                  activeSection === href ? navActiveColorClass : navColorClass
                }`}
              >
                {label}
                {activeSection === href && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href="tel:+78482750750"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-500 hover:text-primary ${
                isScrolled ? "text-dark" : "text-white"
              }`}
              aria-label="Позвонить: +7 (8482) 750-750"
            >
              <Phone className="h-4 w-4" />
              +7 (8482) 750-750
            </a>
            <a
              href="#contacts"
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-primary-dark hover:shadow-md active:scale-[0.97]"
            >
              <MessageCircle className="h-4 w-4" />
              Написать нам
            </a>
          </div>

          <button
            type="button"
            className={`rounded-lg p-2 transition-colors lg:hidden ${
              isScrolled ? "text-dark hover:bg-gray-bg" : "text-white hover:bg-white/10"
            }`}
            onClick={handleMobileToggle}
            aria-label={isMobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 top-16 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={handleCloseMenu}
        aria-hidden="true"
      />

      {/* Mobile panel */}
      <div
        className={`fixed top-16 right-0 bottom-0 z-50 w-72 bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <nav className="flex flex-col px-4 pt-6 pb-8" aria-label="Мобильная навигация">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={handleCloseMenu}
              className={`rounded-lg px-4 py-3.5 text-base font-medium transition-colors ${
                activeSection === href
                  ? "bg-primary/5 text-primary"
                  : "text-dark-light hover:bg-gray-bg hover:text-primary"
              }`}
            >
              {label}
            </a>
          ))}

          <div className="mt-6 border-t border-gray-border pt-6">
            <a
              href="tel:+78482750750"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-semibold text-dark hover:bg-gray-bg"
              aria-label="Позвонить"
            >
              <Phone className="h-5 w-5 text-primary" />
              +7 (8482) 750-750
            </a>
            <a
              href="#contacts"
              onClick={handleCloseMenu}
              className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              <MessageCircle className="h-4 w-4" />
              Написать нам
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
