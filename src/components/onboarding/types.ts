import { ReactElement } from 'react';

export interface IOnBoardingSlide {
  id: string;
  title: string;
  subTitle: string;
  darkImage?: ReactElement;
  lightImage?: ReactElement;
  imageUri?: string;
}

export interface IOnBoardingLastSlideActionButton {
  id: number;
  title: string;
  iconName: string;
  variant: 'filled' | 'tinted' | 'outlined';
  onPress: () => void;
}
