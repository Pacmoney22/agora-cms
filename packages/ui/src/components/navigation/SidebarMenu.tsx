import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface SidebarMenuItem {
  label: string;
  url: string;
  icon?: string;
  children?: SidebarMenuItem[];
}

export interface SidebarMenuProps {
  menuSource?: string;
  items?: SidebarMenuItem[];
  showIcons?: boolean;
  collapsibleSections?: boolean;
  defaultExpanded?: 'all' | 'active-branch' | 'none';
  sticky?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const getDefaultExpandedState = (
  items: SidebarMenuItem[],
  defaultExpanded: 'all' | 'active-branch' | 'none',
): Record<string, boolean> => {
  const state: Record<string, boolean> = {};

  const buildState = (menuItems: SidebarMenuItem[], parentKey = '') => {
    menuItems.forEach((item, index) => {
      const key = `${parentKey}${item.label}-${index}`;
      if (item.children && item.children.length > 0) {
        state[key] = defaultExpanded === 'all';
        buildState(item.children, `${key}-`);
      }
    });
  };

  buildState(items);
  return state;
};

interface MenuItemRendererProps {
  item: SidebarMenuItem;
  index: number;
  depth: number;
  parentKey: string;
  showIcons: boolean;
  collapsibleSections: boolean;
  expandedState: Record<string, boolean>;
  onToggle: (key: string) => void;
}

const MenuItemRenderer: React.FC<MenuItemRendererProps> = ({
  item,
  index,
  depth,
  parentKey,
  showIcons,
  collapsibleSections,
  expandedState,
  onToggle,
}) => {
  const key = `${parentKey}${item.label}-${index}`;
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedState[key] ?? false;

  return (
    <li>
      {hasChildren && collapsibleSections ? (
        <>
          <button
            type="button"
            onClick={() => onToggle(key)}
            className={clsx(
              'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100',
              depth === 0 && 'font-medium text-gray-900',
              depth > 0 && 'text-gray-700',
            )}
            aria-expanded={isExpanded}
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
          >
            <span className="flex items-center gap-2">
              {showIcons && item.icon && (
                <span className="text-gray-400" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              {item.label}
            </span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
            )}
          </button>

          {isExpanded && (
            <ul className="mt-1 space-y-1" role="group">
              {item.children!.map((child, childIndex) => (
                <MenuItemRenderer
                  key={`${key}-${child.label}-${childIndex}`}
                  item={child}
                  index={childIndex}
                  depth={depth + 1}
                  parentKey={`${key}-`}
                  showIcons={showIcons}
                  collapsibleSections={collapsibleSections}
                  expandedState={expandedState}
                  onToggle={onToggle}
                />
              ))}
            </ul>
          )}
        </>
      ) : hasChildren ? (
        <>
          <a
            href={item.url}
            className={clsx(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100',
              depth === 0 && 'font-medium text-gray-900',
              depth > 0 && 'text-gray-700',
            )}
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
          >
            {showIcons && item.icon && (
              <span className="text-gray-400" aria-hidden="true">
                {item.icon}
              </span>
            )}
            {item.label}
          </a>
          <ul className="mt-1 space-y-1" role="group">
            {item.children!.map((child, childIndex) => (
              <MenuItemRenderer
                key={`${key}-${child.label}-${childIndex}`}
                item={child}
                index={childIndex}
                depth={depth + 1}
                parentKey={`${key}-`}
                showIcons={showIcons}
                collapsibleSections={collapsibleSections}
                expandedState={expandedState}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </>
      ) : (
        <a
          href={item.url}
          className={clsx(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100',
            depth === 0 && 'font-medium text-gray-900',
            depth > 0 && 'text-gray-700',
          )}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          {showIcons && item.icon && (
            <span className="text-gray-400" aria-hidden="true">
              {item.icon}
            </span>
          )}
          {item.label}
        </a>
      )}
    </li>
  );
};

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  menuSource,
  items = [],
  showIcons = false,
  collapsibleSections = true,
  defaultExpanded = 'all',
  sticky = false,
  children,
  className,
}) => {
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>(
    () => getDefaultExpandedState(items, defaultExpanded),
  );

  const handleToggle = (key: string) => {
    setExpandedState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <nav
      aria-label="Sidebar navigation"
      className={clsx(
        'w-full',
        sticky && 'sticky top-4',
        className,
      )}
    >
      <ul className="space-y-1" role="tree">
        {items.map((item, index) => (
          <MenuItemRenderer
            key={`${item.label}-${index}`}
            item={item}
            index={index}
            depth={0}
            parentKey=""
            showIcons={showIcons}
            collapsibleSections={collapsibleSections}
            expandedState={expandedState}
            onToggle={handleToggle}
          />
        ))}
      </ul>
      {children}
    </nav>
  );
};
