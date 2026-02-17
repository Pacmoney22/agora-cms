'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { useBuilderStore } from '@/stores/builder-store';
import { getComponent, SHARED_PROP_GROUPS } from '@/lib/component-registry';
import { findNode } from '@/lib/tree-operations';
import { PropertyField } from './PropertyField';
import { SliderEditor } from '@/components/slider/SliderEditor';

const allSharedKeys = new Set(Object.values(SHARED_PROP_GROUPS).flat());

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

  // Separate component-specific props from shared props
  const componentProps = Object.entries(schema.properties).filter(
    ([key]) => !allSharedKeys.has(key),
  );

  // Custom editor for Slider Revolution
  const isSlider = node.componentId === 'enhanced-slider';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
        <span className="text-sm font-medium text-gray-700">{schema.name}</span>
        <span className="text-[10px] text-gray-400">{node.instanceId.slice(0, 8)}</span>
      </div>

      {isSlider ? (
        <SliderEditor
          props={node.props}
          schema={schema.properties}
          onPropChange={handleChange}
        />
      ) : (
        <>
          {/* Component-specific properties */}
          {componentProps.map(([key, propSchema]) => (
            <PropertyField
              key={key}
              name={key}
              schema={propSchema}
              value={node.props[key]}
              onChange={(val) => handleChange(key, val)}
            />
          ))}
        </>
      )}

      {/* Shared properties in collapsible groups */}
      {Object.entries(SHARED_PROP_GROUPS).map(([groupName, keys]) => (
        <SharedPropGroup
          key={groupName}
          label={groupName}
          propKeys={keys}
          schema={schema.properties}
          values={node.props}
          onChange={handleChange}
        />
      ))}
    </div>
  );
};

const SharedPropGroup: React.FC<{
  label: string;
  propKeys: string[];
  schema: Record<string, any>;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}> = ({ label, propKeys, schema, values, onChange }) => {
  const [open, setOpen] = useState(false);

  const availableKeys = propKeys.filter((key) => schema[key]);
  if (availableKeys.length === 0) return null;

  return (
    <div className="border-t border-gray-100 pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600"
      >
        <span>{label}</span>
        <span className={clsx('transition-transform text-[10px]', open && 'rotate-90')}>
          &#x25B6;
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          {availableKeys.map((key) => (
            <PropertyField
              key={key}
              name={key}
              schema={schema[key]}
              value={values[key]}
              onChange={(val) => onChange(key, val)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
