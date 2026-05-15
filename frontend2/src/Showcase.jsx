import { motion } from "motion/react";

export default function Showcase() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center w-full h-full"
    >
      {/* Logo is managed globally in App.jsx for smoother transitions */}
    </motion.div>
  );
}
