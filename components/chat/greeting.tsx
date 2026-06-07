import { motion } from "framer-motion";

const FEATURES = [
  { emoji: "🎯", text: "Bite-sized lessons with one question at a time" },
  { emoji: "🏅", text: "Earn XP, streaks & badges as you go" },
  { emoji: "📈", text: "Your progress is saved across sessions" },
  { emoji: "🚀", text: "Build towards your GCSE, step by step" },
];

const EXAMPLES = [
  "Teach me how to add fractions",
  "Help me get ready for my exam on 17 June",
  "I'm stuck on ratio 1:n",
];

export const Greeting = () => {
  return (
    <div
      className="flex w-full max-w-xl flex-col items-center px-4"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-center font-semibold text-2xl tracking-tight text-foreground md:text-3xl"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        Hey! Ready for some maths? 👋
      </motion.div>

      <motion.p
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 max-w-md text-center text-[15px] text-muted-foreground leading-relaxed"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.42, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        I'm your personal maths tutor for <strong>Year 8 &amp; 9</strong>. We
        learn through quick, friendly chat — I explain a little, then you have a
        go. No worksheets, no pressure.
      </motion.p>

      {/* What you can do */}
      <motion.ul
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 grid w-full gap-2 sm:grid-cols-2"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.52, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {FEATURES.map((f) => (
          <li
            className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/40 px-3 py-2 text-left text-[13px] text-foreground"
            key={f.text}
          >
            <span aria-hidden className="text-base leading-none">
              {f.emoji}
            </span>
            {f.text}
          </li>
        ))}
      </motion.ul>

      {/* Example prompts */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 text-center"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.62, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[13px] text-muted-foreground/80">
          Pick a topic below, or just say something like:
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {EXAMPLES.map((ex) => (
            <span
              className="rounded-full border border-border/50 bg-muted/50 px-2.5 py-1 text-[12px] text-muted-foreground"
              key={ex}
            >
              “{ex}”
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
