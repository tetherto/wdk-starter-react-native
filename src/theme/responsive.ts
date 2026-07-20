import { useWindowDimensions } from 'react-native';

/**
 * Responsive scaling, anchored to the prototype's own design canvas (380×720
 * — see the HTML prototype's `.phone` and `.scr` dimensions). Every font size
 * and spacing value in the design system is authored against this baseline;
 * these helpers scale it to whatever screen it's actually running on.
 *
 * Uses "moderate" scaling (react-native-size-matters' well-known pattern):
 * text grows on larger screens and shrinks on smaller ones, but only by a
 * fraction of the full linear ratio — so a tablet doesn't get comically large
 * text, and a small phone doesn't get illegibly small text.
 */

const BASE_WIDTH = 380;
const BASE_HEIGHT = 720;

export interface Responsive {
  width: number;
  height: number;
  /** Full linear scale by width ratio. Rarely used directly — prefer moderateScale. */
  scale: (size: number) => number;
  /** Full linear scale by height ratio. */
  verticalScale: (size: number) => number;
  /** Dampened width-based scale. Use for font sizes and horizontal spacing. factor: 0 = no scaling, 1 = full linear. Default 0.5. */
  moderateScale: (size: number, factor?: number) => number;
  /** Dampened height-based scale. Use for vertical spacing/gaps. */
  moderateVerticalScale: (size: number, factor?: number) => number;
  /** Percentage of current screen width, in dp (e.g. wp(80) = 80% of screen width). */
  wp: (percent: number) => number;
  /** Percentage of current screen height, in dp. */
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
