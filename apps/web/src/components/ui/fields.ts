/** Classes Tailwind communes aux champs de formulaire (input, select, textarea). */
export const inputClass =
  'w-full h-11 rounded-xl border border-line bg-white/70 px-4 text-[15px] text-ink placeholder:text-ink-soft/50 outline-none transition focus:border-copper focus:bg-white focus:ring-2 focus:ring-copper/20'
export const textareaClass = inputClass.replace('h-11', 'min-h-28 py-3')
