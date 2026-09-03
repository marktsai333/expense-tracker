import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { useStore } from "./store/useStore";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/BottomNav";
import { FAB } from "./components/FAB";
import { Splash } from "./components/Splash";
import { UpdateToast } from "./components/UpdateToast";
import { AddEditSheet } from "./components/AddEditSheet";
import { OverviewPage } from "./components/OverviewPage";
import { ListPage } from "./components/ListPage";
import { AnalysisPage } from "./components/AnalysisPage";
import { SettingsPage } from "./components/SettingsPage";

const PAGES = { overview: OverviewPage, list: ListPage, analysis: AnalysisPage, settings: SettingsPage };

function App() {
  const ready = useStore((s) => s.ready);
  const page = useStore((s) => s.page);
  const init = useStore((s) => s.init);
  const themeOverride = useStore((s) => s.settings.themeOverride);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    init();
    const t = setTimeout(() => setMinTimeElapsed(true), 550);
    return () => clearTimeout(t);
  }, [init]);

  useEffect(() => {
    if (themeOverride === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = themeOverride;
  }, [themeOverride]);

  const showSplash = !ready || !minTimeElapsed;
  const PageComponent = PAGES[page];

  return (
    <MotionConfig reducedMotion="user">
      <Splash visible={showSplash} />
      <UpdateToast />
      <div style={{ paddingBottom: "calc(150px + env(safe-area-inset-bottom))", minHeight: "100vh" }}>
        <TopBar />
        <main className="px-4 pt-4 pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <FAB />
      <BottomNav />
      <AddEditSheet />
      <Toaster
        position="bottom-center"
        offset={110}
        mobileOffset={110}
        toastOptions={{
          style: {
            background: "var(--glass-bg-strong)",
            backdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid var(--glass-border)",
            color: "var(--text)",
          },
        }}
      />
    </MotionConfig>
  );
}

export default App;
