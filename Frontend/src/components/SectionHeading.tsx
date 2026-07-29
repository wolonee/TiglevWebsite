import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
};

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "light",
  className = "",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div className={`${centered ? "mx-auto max-w-2xl text-center" : ""} ${className}`}>
      <p className={`mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] sm:mb-3 sm:text-sm ${tone === "dark" ? "text-primary-light" : "text-primary"}`}>
        {eyebrow}
      </p>
      <h2 className={`text-[1.6rem] font-extrabold leading-tight sm:text-4xl ${tone === "dark" ? "text-white" : "text-dark"}`}>
        {title}
      </h2>
      {description && (
        <p className={`mt-3 text-sm sm:mt-4 sm:text-base ${tone === "dark" ? "text-white/40" : "text-gray-text"}`}>
          {description}
        </p>
      )}
    </div>
  );
}
