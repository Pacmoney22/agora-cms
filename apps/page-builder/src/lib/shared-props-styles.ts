/**
 * Maps shared prop enum values to actual CSS values,
 * and builds inline style + className from component instance props.
 */

const spacingMap: Record<string, string> = {
  none: '0',
  xs: '4px',
  small: '8px',
  medium: '16px',
  large: '32px',
  xl: '64px',
};

export interface SharedStyles {
  style: React.CSSProperties;
  className: string;
  id?: string;
}

export function resolveSharedProps(props: Record<string, unknown>): SharedStyles {
  const style: React.CSSProperties = {};
  const classes: string[] = [];

  // Spacing
  if (props.marginTop && props.marginTop !== 'none') {
    style.marginTop = spacingMap[props.marginTop as string] ?? undefined;
  }
  if (props.marginBottom && props.marginBottom !== 'none') {
    style.marginBottom = spacingMap[props.marginBottom as string] ?? undefined;
  }
  if (props.paddingTop && props.paddingTop !== 'none') {
    style.paddingTop = spacingMap[props.paddingTop as string] ?? undefined;
  }
  if (props.paddingBottom && props.paddingBottom !== 'none') {
    style.paddingBottom = spacingMap[props.paddingBottom as string] ?? undefined;
  }
  if (props.paddingLeft && props.paddingLeft !== 'none') {
    style.paddingLeft = spacingMap[props.paddingLeft as string] ?? undefined;
  }
  if (props.paddingRight && props.paddingRight !== 'none') {
    style.paddingRight = spacingMap[props.paddingRight as string] ?? undefined;
  }

  // Opacity
  if (props.opacity !== undefined && props.opacity !== 100) {
    style.opacity = (props.opacity as number) / 100;
  }

  // Overflow
  if (props.overflow && props.overflow !== 'visible') {
    style.overflow = props.overflow as string;
  }

  // Visibility (responsive hide)
  if (props.hideOnDesktop) classes.push('max-lg:block lg:hidden');
  if (props.hideOnTablet) classes.push('max-md:block md:max-lg:hidden');
  if (props.hideOnMobile) classes.push('max-sm:hidden');

  // Custom CSS class
  if (props.customCssClass && typeof props.customCssClass === 'string') {
    classes.push(props.customCssClass);
  }

  return {
    style,
    className: classes.join(' '),
    id: (props.customId as string) || undefined,
  };
}

/**
 * Check if any shared props have non-default values that need a wrapper div.
 */
export function hasActiveSharedProps(props: Record<string, unknown>): boolean {
  const spacingKeys = ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'];
  for (const key of spacingKeys) {
    if (props[key] && props[key] !== 'none') return true;
  }
  if (props.opacity !== undefined && props.opacity !== 100) return true;
  if (props.overflow && props.overflow !== 'visible') return true;
  if (props.hideOnDesktop || props.hideOnTablet || props.hideOnMobile) return true;
  if (props.customCssClass || props.customId) return true;
  return false;
}
