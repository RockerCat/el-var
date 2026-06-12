export default function AppFooter() {
  return (
    <footer className="border-t border-[#1e1e35] mt-12 px-4 py-5 text-center">
      <p className="text-[11px] text-[#334155] leading-relaxed">
        Hecho en Colombia 🇨🇴 by{" "}
        <a
          href="https://alexsosa.me"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#64748b] hover:text-[#94a3b8] transition-colors underline underline-offset-2"
        >
          AlexSosa.me
        </a>{" "}
        en alianza con  <a
        href="https://www.instagram.com/el_jardin_de_luci/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#64748b] hover:text-[#94a3b8] transition-colors underline underline-offset-2"
      >El Jardin de Lucy</a>, La Superior <a
          href="https://www.facebook.com/hotchipotletunja"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#64748b] hover:text-[#94a3b8] transition-colors underline underline-offset-2"
        >
          Hotchipotle
        </a>{" "}, <a
          href="https://www.foxoriginalsport.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#64748b] hover:text-[#94a3b8] transition-colors underline underline-offset-2"
        >Fox Original Sport</a>, la Alcaldía de Labranzagrande y la docencia del SENA
      </p>
    </footer>
  );
}
