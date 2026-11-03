// RN 0.88 iOS mirrors physical left/right text alignment under RTL.
// Logical start follows the layout direction, independently of mixed text content.
export function localizedTextLayout(rtl: boolean, web: boolean) {
  return {
    ...(web ? {} : {direction: rtl ? "rtl" as const : "ltr" as const}),
    textAlign: web ? (rtl ? "right" as const : "left" as const) : "start" as const,
  };
}
