export default function AppFooter() {
  return (
    <footer className="border-t border-[#1e1e35] mt-12 px-4 py-5 text-center">
      <p className="text-[11px] text-[#334155] leading-relaxed">
        Hecho en Colombia 🇨🇴 by{" "}
        <a
          href="https://alexsosa.me"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#475569] hover:text-[#64748b] transition-colors underline underline-offset-2"
        >
          AlexSosa.me
        </a>{" "}
        en alianza con HotChipotle y La Superior, bajo la coordinación de la docencia del SENA
      </p>
    </footer>
  );
}
