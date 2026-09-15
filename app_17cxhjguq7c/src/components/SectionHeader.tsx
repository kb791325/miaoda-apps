export default function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">
        {number}. {title}
      </div>
      {subtitle ? <div className="mt-1 text-[10px] font-medium text-slate-400">{subtitle}</div> : null}
    </div>
  );
}
