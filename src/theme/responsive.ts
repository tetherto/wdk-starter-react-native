import { useWindowDimensions } from 'react-native';

/**
 * Responsive scaling, anchored to the prototype's own design canvas (380×720
 * — see the HTML prototype's `.phone` and `.scr` dimensions).
 *
 * BASE_WIDTH is set slightly below the prototype's literal 380px on purpose:
 * the design tokens were measured pixel-for-pixel against the prototype's CSS,
 * but a native device render (San Francisco/Roboto, real device pixel
 * density) reads slightly smaller than the same nominal size in a desktop
 * browser mockup. Lowering BASE_WIDTH nudges every scaled size up a small,
 * consistent amount app-wide, rather than hand-adjusting individual tokens
 * (which would drift from the prototype's measured values in an untracked
 * way). If text still needs to read larger/smaller globally, adjust this one
 * constant — not the theme tokens.
 */
const BASE_WIDTH = 360;
const BASE_HEIGHT = 720;

export interface Responsive {
  width: number;
  height: number;
  scale: (size: number) => number;
  verticalScale: (size: number) => number;
  moderateScale: (size: number, factor?: number) => number;
  moderateVerticalScale: (size: number, factor?: number) => number;
  wp: (percent: number) => number;
  hp: (percent: number) => number;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const widthRatio = width / BASE_WIDTH;
  const heightRatio = height / BASE_HEIGHT;

  const scale = (size: number) => size * widthRatio;
  const verticalScale = (size: number) => size * heightRatio;
  const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;
  const moderateVerticalScale = (size: number, factor = 0.5) =>
    size + (verticalScale(size) - size) * factor;
  const wp = (percent: number) => (percent / 100) * width;
  const hp = (percent: number) => (percent / 100) * height;

  return { width, height, scale, verticalScale, moderateScale, moderateVerticalScale, wp, hp };
}
