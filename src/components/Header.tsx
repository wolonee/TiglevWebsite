"use client";

import { useState, useEffect } from "react";
import { Phone, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "#about", label: "О компании" },
  { href: "#catalog", label: "Каталог" },
  { href: "#services", label: "Услуги" },
  { href: "#contacts", label: "Контакты" },
];

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMobileToggle = () => setIsMobileMenuOpen((prev) => !prev);
  const handleCloseMenu = () => setIsMobileMenuOpen(false);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 items-center justify-between lg:h-20">
          {/* Logo */}
          <a
            href="#"
            className="flex items-center gap-2"
            aria-label="TIGLEV — на главную"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-black tracking-tight text-white">
                T
              </span>
            </div>
            <span
              className={`text-xl font-extrabold tracking-tight transition-colors ${
                isScrolled ? "text-dark" : "text-white"
              }`}
            >
              TIGLEV
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 lg:flex" aria-label="Основная навигация">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isScrolled ? "text-dark-light" : "text-white/90"
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Phone + CTA */}
          <div className="hidden items-center gap-4 lg:flex">
            <a
              href="tel:+78482750750"
              className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                isScrolled ? "text-dark" : "text-white"
              }`}
              aria-label="Позвонить: +7 (8482) 750-750"
            >
              <Phone className="h-4 w-4" />
              +7 (8482) 750-750
            </a>
            <a
              href="#contacts"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg"
            >
              Написать нам
            </a>
          </div>

          {/* Mobile burger */}
          <button
            type="button"
            className="lg:hidden"
            onClick={handleMobileToggle}
            aria-label={isMobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className={`h-6 w-6 ${isScrolled ? "text-dark" : "text-white"}`} />
            ) : (
              <Menu className={`h-6 w-6 ${isScrolled ? "text-dark" : "text-white"}`} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-gray-border bg-white lg:hidden">
          <nav className="mx-auto max-w-7xl px-4 py-4" aria-label="Мобильная навигация">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleCloseMenu}
                className="block py-3 text-base font-medium text-dark-light transition-colors hover:text-primary"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-4 border-t border-gray-border pt-4">
              <a
                href="tel:+78482750750"
                className="flex items-center gap-2 py-2 text-base font-semibold text-dark"
                aria-label="Позвонить"
              >
                <Phone className="h-4 w-4" />
                +7 (8482) 750-750
              </a>
              <a
                href="#contacts"
                onClick={handleCloseMenu}
                className="mt-3 block rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-primary-dark"
              >
                Написать нам
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
