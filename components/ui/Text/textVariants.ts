export const textVariants = {
  bodyLarge:
    "text-lg leading-relaxed text-foreground",

  body:
    "text-base leading-normal text-foreground",

  small:
    "text-sm leading-normal text-muted",

  caption:
    "text-xs leading-normal text-muted",
} as const;

export type TextVariant = keyof typeof textVariants;