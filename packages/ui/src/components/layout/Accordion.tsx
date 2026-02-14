import React, { useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, Plus, Minus, ArrowDown } from 'lucide-react';

export interface AccordionItem {
  title: string;
  isDefaultOpen?: boolean;
}

export interface AccordionProps {
  items?: AccordionItem[];
  allowMultipleOpen?: boolean;
  iconStyle?: 'chevron' | 'plus-minus' | 'arrow' | 'none';
  iconPosition?: 'left' | 'right';
  bordered?: boolean;
  accentColor?: string;
  faqSchema?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const ToggleIcon: React.FC<{
  style: AccordionProps['iconStyle'];
  isOpen: boolean;
}> = ({ style, isOpen }) => {
  if (style === 'none') return null;

  const iconClass = clsx(
    'h-5 w-5 transition-transform duration-200',
    style === 'chevron' && isOpen && 'rotate-180',
    style === 'arrow' && isOpen && 'rotate-180',
  );

  if (style === 'plus-minus') {
    return isOpen
      ? <Minus className="h-5 w-5" />
      : <Plus className="h-5 w-5" />;
  }

  if (style === 'arrow') {
    return <ArrowDown className={iconClass} />;
  }

  return <ChevronDown className={iconClass} />;
};

export const Accordion: React.FC<AccordionProps> = ({
  items = [],
  allowMultipleOpen = false,
  iconStyle = 'chevron',
  iconPosition = 'right',
  bordered = true,
  accentColor,
  faqSchema = false,
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const childrenArray = React.Children.toArray(children);

  useEffect(() => {
    if (!allowMultipleOpen && containerRef.current) {
      const details = containerRef.current.querySelectorAll('details');
      const handleToggle = (e: Event) => {
        const target = e.target as HTMLDetailsElement;
        if (target.open) {
          details.forEach((detail) => {
            if (detail !== target) {
              detail.removeAttribute('open');
            }
          });
        }
      };

      details.forEach((detail) => {
        detail.addEventListener('toggle', handleToggle);
      });

      return () => {
        details.forEach((detail) => {
          detail.removeEventListener('toggle', handleToggle);
        });
      };
    }
  }, [allowMultipleOpen, items]);

  const faqJsonLd = faqSchema
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item, index) => ({
          '@type': 'Question',
          name: item.title,
          acceptedAnswer: {
            '@type': 'Answer',
            text: childrenArray[index]
              ? (childrenArray[index] as React.ReactElement<{children?: React.ReactNode}>)?.props?.children ?? ''
              : '',
          },
        })),
      }
    : null;

  return (
    <>
      {faqSchema && faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <div
        ref={containerRef}
        className={clsx('w-full', bordered && 'divide-y divide-gray-200', className)}
        role="region"
      >
        {items.map((item, index) => (
          <details
            key={index}
            open={item.isDefaultOpen}
            className={clsx(
              bordered && 'border-gray-200',
              bordered && index === 0 && 'border-t',
              bordered && index === items.length - 1 && 'border-b',
            )}
          >
            <summary
              className={clsx(
                'flex cursor-pointer items-center gap-3 py-4 px-2 text-base font-medium text-gray-900 select-none',
                'hover:bg-gray-50 transition-colors',
                'list-none [&::-webkit-details-marker]:hidden',
                iconPosition === 'left' && 'flex-row',
                iconPosition === 'right' && 'flex-row-reverse justify-between',
              )}
              style={accentColor ? { color: accentColor } : undefined}
            >
              <ToggleIcon style={iconStyle} isOpen={false} />
              <span>{item.title}</span>
            </summary>
            <div className="px-2 pb-4 text-gray-600">
              {childrenArray[index]}
            </div>
          </details>
        ))}
      </div>
    </>
  );
};
