import { useState } from "react";
import { motion, useMotionValue, animate, type PanInfo } from "motion/react";

export function SwipeToDeleteRow({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const x = useMotionValue(0);
  const [removing, setRemoving] = useState(false);

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const shouldDelete = info.offset.x < -80 || info.velocity.x < -500;
    if (shouldDelete) {
      setRemoving(true);
      animate(x, -400, { duration: 0.2, ease: [0.23, 1, 0.32, 1] });
      setTimeout(onDelete, 200);
    } else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 32 });
    }
  }

  return (
    <motion.div layout className="relative overflow-hidden rounded-2xl">
      <div
        className="absolute inset-0 flex items-center justify-end pr-5"
        style={{ background: "var(--danger)" }}
      >
        <span className="text-white text-sm font-semibold">刪除</span>
      </div>
      <motion.div
        drag={removing ? false : "x"}
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        style={{ x }}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
