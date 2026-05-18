/** Motion system — premium CTV dashboard */

export const CTV_MOTION_DURATION = {
  fast: 150,
  base: 250,
  slow: 350,
  progress: 700,
} as const;

export const CTV_MOTION_EASE = "ease-out" as const;

export const CTV_MOTION_CLASS = {
  base: "transition-[color,background-color,box-shadow,transform,opacity,border-color] duration-[250ms] ease-out",
  panel: "transition-opacity duration-[250ms] ease-out",
  tab: "transition-[color,background-color,box-shadow,transform] duration-[250ms] ease-out",
  row: "transition-[background-color,box-shadow,transform] duration-[250ms] ease-out",
  card: "transition-[transform,box-shadow,border-color] duration-[250ms] ease-out hover:-translate-y-0.5",
} as const;
