export const headingVariants = {
  display:
    "text-4xl md:text-6xl font-bold tracking-tight text-foreground",

  h1:
    "text-3xl md:text-5xl font-bold tracking-tight text-foreground",

  h2:
    "text-2xl md:text-4xl font-semibold tracking-tight text-foreground",

  h3:
    "text-xl md:text-2xl font-semibold text-foreground",
} as const;

export type HeadingVariant = keyof typeof headingVariants;