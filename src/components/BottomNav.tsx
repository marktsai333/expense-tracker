import { Tabbar, TabbarLink } from "konsta/react";
import { useStore, type Page } from "../store/useStore";

const NAV_ITEMS: { page: Page; icon: string; label: string }[] = [
  { page: "overview", icon: "🏠", label: "總覽" },
  { page: "accounts", icon: "🏦", label: "帳戶" },
  { page: "analysis", icon: "📊", label: "分析" },
  { page: "list", icon: "🧾", label: "明細" },
  { page: "settings", icon: "👤", label: "我的" },
];

export function BottomNav() {
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);

  return (
    <Tabbar labels icons className="fixed left-0 bottom-0 z-20">
      {NAV_ITEMS.map((item) => (
        <TabbarLink
          key={item.page}
          active={page === item.page}
          onClick={() => setPage(item.page)}
          icon={<span className="text-[20px] leading-none">{item.icon}</span>}
          label={item.label}
        />
      ))}
    </Tabbar>
  );
}
