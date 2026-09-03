import { useEffect, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { motion, useDragControls, useMotionValue, animate, type PanInfo } from "motion/react";

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
  const dragControls = useDragControls();
  const y = useMotionValue(0);

  useEffect(() => {
    if (open) y.set(0);
  }, [open, y]);

  function handleDragEnd(_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 600) {
      onOpenChange(false);
    } else {
      animate(y, 0, { type: "spring", stiffness: 500, damping: 34 });
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className="fixed inset-0 z-30 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
          style={{ background: "rgba(10,15,15,0.45)" }}
        />
        <Dialog.Popup
          className="fixed left-0 right-0 bottom-0 z-30 rounded-t-[24px] transition-all duration-250 ease-out data-[starting-style]:opacity-0 data-[starting-style]:translate-y-6 data-[ending-style]:opacity-0 data-[ending-style]:translate-y-6 overflow-hidden"
          style={{
            background: "var(--glass-bg-strong)",
            backdropFilter: "blur(30px) saturate(180%)",
            border: "1px solid var(--glass-border)",
            borderBottom: "none",
            maxHeight: "88vh",
          }}
        >
          <motion.div
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 500 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            style={{ y, maxHeight: "88vh", overflowY: "auto" }}
            className="px-5 pt-2.5"
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="w-10 h-1.5 rounded-full mx-auto mb-3"
              style={{ background: "var(--glass-border)", touchAction: "none", cursor: "grab" }}
            />
            <Dialog.Title className="text-[17px] font-bold mb-4">{title}</Dialog.Title>
            <div style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>{children}</div>
          </motion.div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
