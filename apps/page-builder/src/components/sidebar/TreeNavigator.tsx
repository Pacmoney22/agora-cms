'use client';

import React from 'react';
import { clsx } from 'clsx';
import { useBuilderStore } from '@/stores/builder-store';
import { getComponent } from '@/lib/component-registry';
import type { ComponentInstance } from '@nextgen-cms/shared';

export const TreeNavigator: React.FC = () => {
  const { componentTree, selectedInstanceId, selectComponent } = useBuilderStore();

  return (
    <div className="space-y-1">
      {componentTree.root.children.map((child) => (
        <TreeNode
          key={child.instanceId}
          instance={child}
          depth={0}
          selectedId={selectedInstanceId}
          onSelect={selectComponent}
        />
      ))}
      {componentTree.root.children.length === 0 && (
        <p className="py-4 text-center text-xs text-gray-400">Empty page</p>
      )}
    </div>
  );
};

interface TreeNodeProps {
  instance: ComponentInstance;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ instance, depth, selectedId, onSelect }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const registered = getComponent(instance.componentId);
  const label = registered?.schema.name || instance.componentId;
  const hasChildren = instance.children.length > 0;
  const isSelected = selectedId === instance.instanceId;

  return (
    <div>
      <div
        className={clsx(
          'flex items-center gap-1 rounded px-1 py-0.5 text-xs cursor-pointer transition-colors',
          isSelected
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100',
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={() => onSelect(instance.instanceId)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-3 text-[10px] text-gray-400"
          >
            {isExpanded ? '\u25BC' : '\u25B6'}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <span className="truncate">{label}</span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {instance.children.map((child) => (
            <TreeNode
              key={child.instanceId}
              instance={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
