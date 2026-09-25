'use client';

export type NavItem = {
  key: string;
  label: string;
  available: boolean;
  badge?: number;
};

export function Sidebar({
  items,
  activeKey,
  onSelect,
  onLogout
}: {
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="flex w-[260px] shrink-0 flex-col gap-1 border-r border-line bg-white px-4 py-6">
      <div className="mb-6 flex items-baseline gap-1.5 px-2">
        <span className="text-lg font-extrabold">Aeries</span>
        <span className="text-lg font-medium text-accent">Benefits Hub</span>
      </div>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            disabled={!item.available}
            onClick={() => item.available && onSelect(item.key)}
            className={`flex items-center gap-3 rounded-[10px] px-3.5 py-3 text-left text-sm font-bold transition ${
              active
                ? 'bg-accentSoft text-accentDark'
                : item.available
                  ? 'text-[#374151] hover:bg-bg'
                  : 'cursor-not-allowed text-line'
            }`}
          >
            <span className="flex-1 leading-tight">{item.label}</span>
            {!item.available && <span className="text-[10px] font-semibold uppercase tracking-wide">Soon</span>}
            {item.available && !!item.badge && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-extrabold text-white">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
      <div className="mt-auto pt-6">
        <button onClick={onLogout} className="w-full rounded-[10px] px-3.5 py-3 text-left text-sm font-bold text-muted hover:bg-bg">
          Log out
        </button>
      </div>
    </aside>
  );
}
