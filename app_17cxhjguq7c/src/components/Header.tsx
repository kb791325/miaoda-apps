import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-[#FFFFFF]/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <SidebarTrigger className="shrink-0" />
        <Separator orientation="vertical" className="hidden !h-4 w-[1px] bg-[#E2E8F0] md:block" />
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">AI Video Workshop</span>
          <span className="ml-3 hidden text-[10px] font-medium text-slate-400 md:inline">AI短视频全流程创作平台</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-[2px] bg-[#ECFDF5] px-1.5 py-0.5 text-[10px] font-bold text-[#10B981] sm:inline">运行中</span>
          <div className="flex size-7 items-center justify-center bg-[#0033A0] text-xs font-bold text-white rounded-none">张</div>
          <span className="hidden text-xs font-bold text-slate-700 md:inline">张浩然</span>
        </div>
      </div>
    </header>
  );
}
