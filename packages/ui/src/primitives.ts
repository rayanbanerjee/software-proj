export const surfaceVariants = ["solid", "outline", "ghost"] as const;

export type SurfaceVariant = (typeof surfaceVariants)[number];

export const toneVariants = ["neutral", "primary", "success", "danger"] as const;

export type ToneVariant = (typeof toneVariants)[number];

export interface PrimitiveStyleTokens {
  radius: string;
  paddingX: string;
  paddingY: string;
  gap: string;
}

export interface ButtonPrimitive {
  kind: "button";
  variant: SurfaceVariant;
  tone: ToneVariant;
  tokens: PrimitiveStyleTokens;
}

export interface CardPrimitive {
  kind: "card";
  variant: Exclude<SurfaceVariant, "ghost">;
  tokens: PrimitiveStyleTokens;
}

export interface DialogPrimitive {
  kind: "dialog";
  size: "sm" | "md" | "lg";
  tokens: PrimitiveStyleTokens;
}

export const buttonPrimitive: ButtonPrimitive = {
  kind: "button",
  variant: "solid",
  tone: "primary",
  tokens: {
    radius: "999px",
    paddingX: "1rem",
    paddingY: "0.625rem",
    gap: "0.5rem"
  }
};

export const cardPrimitive: CardPrimitive = {
  kind: "card",
  variant: "outline",
  tokens: {
    radius: "1rem",
    paddingX: "1rem",
    paddingY: "1rem",
    gap: "0.75rem"
  }
};

export const dialogPrimitive: DialogPrimitive = {
  kind: "dialog",
  size: "md",
  tokens: {
    radius: "1.25rem",
    paddingX: "1.25rem",
    paddingY: "1.25rem",
    gap: "1rem"
  }
};
