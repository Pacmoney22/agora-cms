import React from 'react';
import { clsx } from 'clsx';

export interface SharedProps {
  marginTop?: 'none' | 'xs' | 'small' | 'medium' | 'large' | 'xl';
  marginBottom?: 'none' | 'xs' | 'small' | 'medium' | 'large' | 'xl';
  paddingTop?: 'none' | 'xs' | 'small' | 'medium' | 'large' | 'xl';
  paddingBottom?: 'none' | 'xs' | 'small' | 'medium' | 'large' | 'xl';
  paddingLeft?: 'none' | 'xs' | 'small' | 'medium' | 'large' | 'xl';
  paddingRight?: 'none' | 'xs' | 'small' | 'medium' | 'large' | 'xl';
  hideOnDesktop?: boolean;
  hideOnTablet?: boolean;
  hideOnMobile?: boolean;
  visibilityCondition?: 'always' | 'logged-in' | 'logged-out' | 'has-cart-items';
  customCssClass?: string;
  customId?: string;
  opacity?: number;
  overflow?: 'visible' | 'hidden' | 'auto';
  entranceAnimation?: 'none' | 'fade-in' | 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'zoom-in' | 'slide-up';
  animationDuration?: 'fast' | 'normal' | 'slow';
  animationDelay?: number;
  animationEasing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  ariaLabel?: string;
  ariaHidden?: boolean;
  role?: string;
}

const spacingMap: Record<string, string> = {
  none: '0',
  xs: '0.5rem',
  small: '1rem',
  medium: '2rem',
  large: '4rem',
  xl: '6rem',
};

/**
 * Hook that computes shared prop styles/classes for any component.
 * Returns className string, style object, and HTML attributes.
 */
export function useSharedProps(props: SharedProps) {
  const className = clsx(
    props.hideOnDesktop && 'lg:hidden',
    props.hideOnTablet && 'max-lg:hidden max-md:block',
    props.hideOnMobile && 'max-md:hidden',
    props.customCssClass,
  );

  const style: React.CSSProperties = {
    marginTop: props.marginTop && props.marginTop !== 'none' ? spacingMap[props.marginTop] : undefined,
    marginBottom: props.marginBottom && props.marginBottom !== 'none' ? spacingMap[props.marginBottom] : undefined,
    paddingTop: props.paddingTop && props.paddingTop !== 'none' ? spacingMap[props.paddingTop] : undefined,
    paddingBottom: props.paddingBottom && props.paddingBottom !== 'none' ? spacingMap[props.paddingBottom] : undefined,
    paddingLeft: props.paddingLeft && props.paddingLeft !== 'none' ? spacingMap[props.paddingLeft] : undefined,
    paddingRight: props.paddingRight && props.paddingRight !== 'none' ? spacingMap[props.paddingRight] : undefined,
    opacity: props.opacity != null && props.opacity < 100 ? props.opacity / 100 : undefined,
    overflow: props.overflow && props.overflow !== 'visible' ? props.overflow : undefined,
  };

  const attrs: Record<string, unknown> = {};
  if (props.customId) attrs.id = props.customId;
  if (props.ariaLabel) attrs['aria-label'] = props.ariaLabel;
  if (props.ariaHidden) attrs['aria-hidden'] = true;
  if (props.role) attrs.role = props.role;

  return { className, style, attrs };
}
