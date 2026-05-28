export default function Footer() {
  return (
    <footer className="border-t border-[#1e1e35] px-4 py-8 mt-8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#00c85a] flex items-center justify-center">
            <svg width="14" height="10" viewBox="0 0 18 14" fill="none">
              <path
                d="M1 1L5.5 12L9 5L12.5 12L17 1"
                stroke="#0a0a12"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-sm font-bold text-[#f1f5f9]">
            El <span className="text-[#00c85a]">VAR</span>
          </span>
        </div>
        <p className="text-xs text-[#475569] text-center">
          No afiliado a la FIFA. Solo para entretenimiento. Copa del Mundo 2026.
        </p>
        <p className="text-xs text-[#475569]">
          Hecho para los fanáticos del fútbol ⚽
        </p>
      </div>
    </footer>
  );
}
