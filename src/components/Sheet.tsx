import type { ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className="fixed inset-0 z-30 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
          style={{ background: "rgba(10,15,15,0.45)" }}
        />
        <Dialog.Popup
          className="fixed left-0 right-0 bottom-0 z-30 rounded-t-[24px] px-5 pt-5.5 transition-all duration-250 ease-out data-[starting-style]:opacity-0 data-[starting-style]:translate-y-5 data-[ending-style]:opacity-0 data-[ending-style]:translate-y-5 overflow-y-auto"
          style={{
            background: "var(--glass-bg-strong)",
            backdropFilter: "blur(30px) saturate(180%)",
            border: "1px solid var(--glass-border)",
            borderBottom: "none",
            paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
            maxHeight: "88vh",
          }}
        >
          <div
            className="w-10 h-1.5 rounded-full mx-auto mb-3"
            style={{ background: "var(--glass-border)" }}
          />
          <Dialog.Title className="text-[17px] font-bold mb-4">{title}</Dialog.Title>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
