import { Tabbar, TabbarLink } from "konsta/react";
import { useStore, type Page } from "../store/useStore";
import { IconOverview, IconAccounts, IconAnalysis, IconList, IconMe } from "./TabIcons";

const NAV_ITEMS: { page: Page; Icon: React.ComponentType<{ active?: boolean }>; label: string }[] = [
  { page: "overview", Icon: IconOverview, label: "總覽" },
  { page: "accounts", Icon: IconAccounts, label: "帳戶" },
  { page: "analysis", Icon: IconAnalysis, label: "分析" },
  { page: "list", Icon: IconList, label: "明細" },
  { page: "settings", Icon: IconMe, label: "我的" },
];

export function BottomNav() {
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);

  return (
    <Tabbar labels icons className="fixed left-0 bottom-0 z-20">
      {NAV_ITEMS.map(({ page: p, Icon, label }) => (
        <TabbarLink
          key={p}
          active={page === p}
          onClick={() => setPage(p)}
          icon={<Icon active={page === p} />}
          label={label}
        />
      ))}
    </Tabbar>
  );
}
