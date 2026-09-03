import { useSyncExternalStore } from "react";
import { useStore } from "../store/useStore";

const media = window.matchMedia("(prefers-color-scheme: dark)");

function subscribe(callback: () => void) {
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getSystemPrefersDark() {
  return media.matches;
}

export function useIsDark() {
  const systemPrefersDark = useSyncExternalStore(subscribe, getSystemPrefersDark);
  const themeOverride = useStore((s) => s.settings.themeOverride);
  if (themeOverride === "light") return false;
  if (themeOverride === "dark") return true;
  return systemPrefersDark;
}
