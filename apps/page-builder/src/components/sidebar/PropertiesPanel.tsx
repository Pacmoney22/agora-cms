'use client';

import React from 'react';
import { useBuilderStore } from '@/stores/builder-store';
import { getComponent } from '@/lib/component-registry';
import { findNode } from '@/lib/tree-operations';
import { PropertyField } from './PropertyField';

export const PropertiesPanel: React.FC = () => {
  const { componentTree, selectedInstanceId, updateComponentProps } = useBuilderStore();

  if (!selectedInstanceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <p className="text-sm">Select a component</p>
        <p className="text-xs">to edit its properties</p>
      </div>
    );
  }

  const node = findNode(componentTree.root, selectedInstanceId);
  if (!node) return null;

  const registered = getComponent(node.componentId);
  if (!registered) {
    return <p className="text-sm text-red-500">Unknown component: {node.componentId}</p>;
  }

  const { schema } = registered;

  const handleChange = (key: string, value: unknown) => {
    updateComponentProps(selectedInstanceId, { [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
        <span className="text-sm font-medium text-gray-700">{schema.name}</span>
        <span className="text-[10px] text-gray-400">{node.instanceId.slice(0, 8)}</span>
      </div>

      {Object.entries(schema.properties).map(([key, propSchema]) => (
        <PropertyField
          key={key}
          name={key}
          schema={propSchema}
          value={node.props[key]}
          onChange={(val) => handleChange(key, val)}
        />
      ))}
    </div>
  );
};
