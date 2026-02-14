import React from 'react';
import { clsx } from 'clsx';
import { Check, Circle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export interface ListItem {
  text: string;
  description?: string;
  icon?: string;
  children?: ListItem[];
}

export interface ListProps {
  items?: ListItem[];
  listType?: 'unordered' | 'ordered' | 'icon' | 'checklist';
  bulletStyle?: 'disc' | 'circle' | 'square' | 'dash' | 'none';
  iconColor?: string;
  spacing?: 'compact' | 'normal' | 'relaxed';
  columns?: 1 | 2 | 3;
  children?: React.ReactNode;
  className?: string;
}

const spacingMap = {
  compact: 'space-y-1',
  normal: 'space-y-2',
  relaxed: 'space-y-4',
};

const bulletMap = {
  disc: 'list-disc',
  circle: 'list-[circle]',
  square: 'list-square',
  dash: 'list-none',
  none: 'list-none',
};

const columnMap = {
  1: '',
  2: 'sm:columns-2',
  3: 'sm:columns-2 lg:columns-3',
};

const getIconComponent = (iconName: string): React.FC<{ className?: string; style?: React.CSSProperties }> | null => {
  const icons = LucideIcons as Record<string, unknown>;
  const component = icons[iconName];
  if (component && typeof component === 'function') {
    return component as React.FC<{ className?: string; style?: React.CSSProperties }>;
  }
  return null;
};

const ListItemContent: React.FC<{
  item: ListItem;
  listType: ListProps['listType'];
  bulletStyle: ListProps['bulletStyle'];
  iconColor?: string;
  spacing: ListProps['spacing'];
}> = ({ item, listType, bulletStyle, iconColor, spacing }) => {
  const renderIcon = () => {
    if (listType === 'checklist') {
      return (
        <Check
          className="mt-0.5 h-4 w-4 flex-shrink-0"
          style={iconColor ? { color: iconColor } : { color: '#10b981' }}
        />
      );
    }

    if (listType === 'icon' && item.icon) {
      const IconComponent = getIconComponent(item.icon);
      if (IconComponent) {
        return (
          <IconComponent
            className="mt-0.5 h-4 w-4 flex-shrink-0"
            style={iconColor ? { color: iconColor } : undefined}
          />
        );
      }
      return (
        <Circle
          className="mt-0.5 h-4 w-4 flex-shrink-0"
          style={iconColor ? { color: iconColor } : undefined}
        />
      );
    }

    if (bulletStyle === 'dash' && listType === 'unordered') {
      return <span className="mr-2 text-gray-400">&mdash;</span>;
    }

    return null;
  };

  const icon = renderIcon();

  return (
    <>
      <div className={clsx('flex', icon && 'gap-2')}>
        {icon}
        <div>
          <span className="text-gray-900">{item.text}</span>
          {item.description && (
            <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
          )}
        </div>
      </div>
      {item.children && item.children.length > 0 && (
        <ul
          className={clsx(
            'ml-6 mt-1',
            spacingMap[spacing || 'normal'],
            listType === 'unordered' && bulletMap[bulletStyle || 'disc'],
            listType === 'ordered' && 'list-decimal',
            (listType === 'icon' || listType === 'checklist') && 'list-none',
          )}
        >
          {item.children.map((child, index) => (
            <li key={index}>
              <ListItemContent
                item={child}
                listType={listType}
                bulletStyle={bulletStyle}
                iconColor={iconColor}
                spacing={spacing}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export const List: React.FC<ListProps> = ({
  items = [],
  listType = 'unordered',
  bulletStyle = 'disc',
  iconColor,
  spacing = 'normal',
  columns = 1,
  children,
  className,
}) => {
  const isOrdered = listType === 'ordered';
  const Tag = isOrdered ? 'ol' : 'ul';

  const listClasses = clsx(
    spacingMap[spacing],
    columnMap[columns],
    listType === 'unordered' && bulletStyle !== 'dash' && bulletMap[bulletStyle],
    listType === 'unordered' && bulletStyle !== 'dash' && bulletStyle !== 'none' && 'pl-5',
    isOrdered && 'list-decimal pl-5',
    (listType === 'icon' || listType === 'checklist') && 'list-none',
    className,
  );

  return (
    <Tag className={listClasses}>
      {items.map((item, index) => (
        <li key={index} className="break-inside-avoid">
          <ListItemContent
            item={item}
            listType={listType}
            bulletStyle={bulletStyle}
            iconColor={iconColor}
            spacing={spacing}
          />
        </li>
      ))}
      {children}
    </Tag>
  );
};
