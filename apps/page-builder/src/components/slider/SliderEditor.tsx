'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { PropertyField } from '@/components/sidebar/PropertyField';
import { MediaField } from '@/components/sidebar/MediaField';
import type { PropertySchema } from '@/lib/component-registry';

interface SlideData {
  title: string;
  backgroundType: string;
  backgroundValue: string;
  backgroundImage?: string | null;
  kenBurns: boolean;
  overlay: string;
  duration: number;
  layers: LayerData[];
}

interface LayerData {
  layerType: string;
  content: string;
  imageSrc?: string | null;
  x: number;
  y: number;
  width: string;
  height: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  backgroundColor?: string | null;
  borderRadius: string;
  padding: string;
  zIndex: number;
  animationIn: string;
  animationOut: string;
  animationInDuration: number;
  animationOutDuration: number;
  animationInDelay: number;
  loopAnimation: string;
  clickAction: string;
  clickUrl?: string | null;
  hideOnMobile: boolean;
  hideOnTablet: boolean;
}

interface SliderEditorProps {
  props: Record<string, unknown>;
  schema: Record<string, PropertySchema>;
  onPropChange: (key: string, value: unknown) => void;
}

/* ── Layer Schemas (for PropertyField rendering) ──────────── */

const layerSchemas: Record<string, PropertySchema> = {
  layerType:         { type: 'enum', values: ['text', 'image', 'button', 'shape', 'icon'], default: 'text', label: 'Type' },
  content:           { type: 'string', default: '', label: 'Content' },
  imageSrc:          { type: 'image', default: null, label: 'Image' },
  x:                 { type: 'number', default: 50, min: 0, max: 100, label: 'X (%)' },
  y:                 { type: 'number', default: 50, min: 0, max: 100, label: 'Y (%)' },
  width:             { type: 'string', default: 'auto', label: 'Width' },
  height:            { type: 'string', default: 'auto', label: 'Height' },
  fontSize:          { type: 'number', default: 24, min: 8, max: 200, label: 'Font Size' },
  fontWeight:        { type: 'enum', values: ['300', '400', '500', '600', '700', '800', '900'], default: '600', label: 'Weight' },
  color:             { type: 'color', default: '#ffffff', label: 'Color' },
  backgroundColor:   { type: 'color', default: null, label: 'Bg Color' },
  borderRadius:      { type: 'string', default: '0', label: 'Radius' },
  padding:           { type: 'string', default: '0', label: 'Padding' },
  zIndex:            { type: 'number', default: 1, min: 0, max: 100, label: 'Z-Index' },
  animationIn:       { type: 'enum', values: ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out', 'rotate'], default: 'fade', label: 'In Anim' },
  animationOut:      { type: 'enum', values: ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out', 'rotate'], default: 'fade', label: 'Out Anim' },
  animationInDuration:  { type: 'number', default: 600, min: 100, max: 3000, label: 'In Dur (ms)' },
  animationOutDuration: { type: 'number', default: 400, min: 100, max: 3000, label: 'Out Dur (ms)' },
  animationInDelay:     { type: 'number', default: 0, min: 0, max: 5000, label: 'In Delay (ms)' },
  loopAnimation:        { type: 'enum', values: ['none', 'pulse', 'bounce', 'rotate', 'float'], default: 'none', label: 'Loop' },
  clickAction:          { type: 'enum', values: ['none', 'url', 'next-slide', 'prev-slide', 'scroll-down'], default: 'none', label: 'Click Action' },
  clickUrl:             { type: 'url', default: null, label: 'Click URL' },
  hideOnMobile:         { type: 'boolean', default: false, label: 'Hide Mobile' },
  hideOnTablet:         { type: 'boolean', default: false, label: 'Hide Tablet' },
};

/* ── Slide Settings Schemas ───────────────────────────────── */

const slideSchemas: Record<string, PropertySchema> = {
  title:           { type: 'string', default: 'Slide', label: 'Slide Title' },
  backgroundType:  { type: 'enum', values: ['color', 'image', 'gradient', 'video'], default: 'color', label: 'Bg Type' },
  // backgroundValue is rendered separately via BackgroundValueEditor
  kenBurns:        { type: 'boolean', default: false, label: 'Ken Burns' },
  overlay:         { type: 'enum', values: ['none', 'dark', 'light', 'gradient'], default: 'none', label: 'Overlay' },
  duration:        { type: 'number', default: 5000, min: 1000, max: 30000, label: 'Duration (ms)' },
};

/* ── Gradient Presets ─────────────────────────────────────── */

const GRADIENT_PRESETS = [
  { name: 'Purple Haze', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Ocean', value: 'linear-gradient(135deg, #0c3547 0%, #1f6f8b 50%, #99e2d0 100%)' },
  { name: 'Sunset', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #0b8793 0%, #360033 100%)' },
  { name: 'Fire', value: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' },
  { name: 'Night Sky', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  { name: 'Warm', value: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)' },
  { name: 'Cool Blue', value: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { name: 'Dark', value: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)' },
  { name: 'Gold', value: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' },
  { name: 'Emerald', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { name: 'Midnight', value: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
];

/* ── Background Value Editor ──────────────────────────────── */

const BackgroundValueEditor: React.FC<{
  bgType: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ bgType, value, onChange }) => {
  switch (bgType) {
    case 'color':
      return (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500">Background Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded border border-gray-200"
            />
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
            />
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500">Background Image</label>
          <MediaField
            value={value || ''}
            onChange={(v) => onChange(v ?? '')}
            placeholder="Image URL or browse..."
            mimeTypeFilter="image"
          />
        </div>
      );

    case 'video':
      return (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500">Background Video</label>
          <MediaField
            value={value || ''}
            onChange={(v) => onChange(v ?? '')}
            placeholder="Video URL or browse..."
            mimeTypeFilter="video"
          />
        </div>
      );

    case 'gradient':
      return (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-500">Gradient</label>
          {/* Live preview */}
          <div
            className="h-12 w-full rounded-md border border-gray-200"
            style={{ background: value || '#ccc' }}
          />
          {/* Presets grid */}
          <div className="grid grid-cols-4 gap-1">
            {GRADIENT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                title={preset.name}
                onClick={() => onChange(preset.value)}
                className={clsx(
                  'h-8 rounded border transition-all',
                  value === preset.value
                    ? 'border-blue-500 ring-2 ring-blue-300'
                    : 'border-gray-200 hover:border-gray-400',
                )}
                style={{ background: preset.value }}
              />
            ))}
          </div>
          {/* Custom CSS input */}
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:border-blue-400 focus:outline-none"
          />
          <p className="text-[10px] text-gray-400">Choose a preset or enter custom CSS gradient</p>
        </div>
      );

    default:
      return (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500">Background Value</label>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
          />
        </div>
      );
  }
};

/* ── Module-Level Settings Schemas ────────────────────────── */

const moduleSchemas: Record<string, PropertySchema> = {
  layout:             { type: 'enum', values: ['auto', 'full-width', 'full-screen'], default: 'full-width', label: 'Layout' },
  height:             { type: 'number', default: 500, min: 100, max: 1200, label: 'Height (px)' },
  autoplay:           { type: 'boolean', default: true, label: 'Autoplay' },
  autoplayInterval:   { type: 'number', default: 5000, min: 1000, max: 30000, label: 'Interval (ms)' },
  pauseOnHover:       { type: 'boolean', default: true, label: 'Pause Hover' },
  loop:               { type: 'boolean', default: true, label: 'Loop' },
  transition:         { type: 'enum', values: ['fade', 'slide-h', 'slide-v', 'curtain'], default: 'fade', label: 'Transition' },
  transitionDuration: { type: 'number', default: 800, min: 200, max: 3000, label: 'Trans. Dur (ms)' },
  showArrows:         { type: 'boolean', default: true, label: 'Arrows' },
  showBullets:        { type: 'boolean', default: true, label: 'Bullets' },
  showProgressBar:    { type: 'boolean', default: false, label: 'Progress Bar' },
};

/* ── Helper: Default Layer ─────────────────────────────────── */

function createDefaultLayer(): LayerData {
  return {
    layerType: 'text',
    content: 'New Layer',
    imageSrc: null,
    x: 50,
    y: 50,
    width: 'auto',
    height: 'auto',
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: null,
    borderRadius: '0',
    padding: '0',
    zIndex: 1,
    animationIn: 'fade',
    animationOut: 'fade',
    animationInDuration: 600,
    animationOutDuration: 400,
    animationInDelay: 0,
    loopAnimation: 'none',
    clickAction: 'none',
    clickUrl: null,
    hideOnMobile: false,
    hideOnTablet: false,
  };
}

function createDefaultSlide(): SlideData {
  return {
    title: 'New Slide',
    backgroundType: 'color',
    backgroundValue: '#1a1a2e',
    backgroundImage: null,
    kenBurns: false,
    overlay: 'none',
    duration: 5000,
    layers: [],
  };
}

/* ── Main Editor ──────────────────────────────────────────── */

export const SliderEditor: React.FC<SliderEditorProps> = ({
  props,
  schema,
  onPropChange,
}) => {
  const [activeSection, setActiveSection] = useState<'module' | 'slides'>('slides');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeLayerIndex, setActiveLayerIndex] = useState<number | null>(null);

  const slides = (props.slides as SlideData[]) || [];
  const activeSlide = slides[activeSlideIndex];

  const updateSlides = (newSlides: SlideData[]) => {
    onPropChange('slides', newSlides);
  };

  const updateSlide = (slideIndex: number, key: string, value: unknown) => {
    const updated = slides.map((s, i) =>
      i === slideIndex ? { ...s, [key]: value } : s,
    );
    updateSlides(updated);
  };

  const addSlide = () => {
    updateSlides([...slides, createDefaultSlide()]);
    setActiveSlideIndex(slides.length);
    setActiveLayerIndex(null);
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) return;
    const updated = slides.filter((_, i) => i !== index);
    updateSlides(updated);
    if (activeSlideIndex >= updated.length) {
      setActiveSlideIndex(Math.max(0, updated.length - 1));
    }
    setActiveLayerIndex(null);
  };

  const moveSlide = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const updated = [...slides];
    const a = updated[index]!;
    const b = updated[target]!;
    updated[index] = b;
    updated[target] = a;
    updateSlides(updated);
    setActiveSlideIndex(target);
  };

  const addLayer = () => {
    if (!activeSlide) return;
    const updated = [...slides];
    const newLayers = [...activeSlide.layers, createDefaultLayer()];
    updated[activeSlideIndex] = { ...activeSlide, layers: newLayers };
    updateSlides(updated);
    setActiveLayerIndex(newLayers.length - 1);
  };

  const removeLayer = (layerIndex: number) => {
    if (!activeSlide) return;
    const updated = [...slides];
    const newLayers = activeSlide.layers.filter((_, i) => i !== layerIndex);
    updated[activeSlideIndex] = { ...activeSlide, layers: newLayers };
    updateSlides(updated);
    if (activeLayerIndex === layerIndex) setActiveLayerIndex(null);
    else if (activeLayerIndex !== null && activeLayerIndex > layerIndex) {
      setActiveLayerIndex(activeLayerIndex - 1);
    }
  };

  const updateLayer = (layerIndex: number, key: string, value: unknown) => {
    if (!activeSlide) return;
    const updated = [...slides];
    const newLayers = activeSlide.layers.map((l, i) =>
      i === layerIndex ? { ...l, [key]: value } : l,
    );
    updated[activeSlideIndex] = { ...activeSlide, layers: newLayers };
    updateSlides(updated);
  };

  const activeLayer = activeLayerIndex !== null ? activeSlide?.layers[activeLayerIndex] : null;

  return (
    <div className="flex flex-col gap-2">
      {/* Section Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveSection('slides')}
          className={clsx(
            'flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors',
            activeSection === 'slides'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500',
          )}
        >
          Slides ({slides.length})
        </button>
        <button
          onClick={() => setActiveSection('module')}
          className={clsx(
            'flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors',
            activeSection === 'module'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500',
          )}
        >
          Settings
        </button>
      </div>

      {activeSection === 'module' ? (
        /* ── Module Settings ─────────────────────────────── */
        <div className="space-y-3 px-1">
          {Object.entries(moduleSchemas).map(([key, s]) => (
            <PropertyField
              key={key}
              name={key}
              schema={s}
              value={props[key]}
              onChange={(v) => onPropChange(key, v)}
            />
          ))}
        </div>
      ) : (
        /* ── Slides Editor ───────────────────────────────── */
        <div className="space-y-2 px-1">
          {/* Slide list */}
          <div className="space-y-1">
            {slides.map((slide, i) => (
              <div
                key={i}
                className={clsx(
                  'flex items-center gap-1 rounded px-2 py-1 text-xs cursor-pointer transition-colors',
                  i === activeSlideIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600',
                )}
                onClick={() => { setActiveSlideIndex(i); setActiveLayerIndex(null); }}
              >
                <span
                  className="h-5 w-5 shrink-0 rounded border border-gray-200"
                  style={{
                    background:
                      slide.backgroundType === 'image'
                        ? `url(${slide.backgroundValue}) center/cover`
                        : slide.backgroundValue || '#ccc',
                  }}
                />
                <span className="flex-1 truncate">{slide.title || `Slide ${i + 1}`}</span>
                <button onClick={(e) => { e.stopPropagation(); moveSlide(i, -1); }} disabled={i === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Move up">&#x25B2;</button>
                <button onClick={(e) => { e.stopPropagation(); moveSlide(i, 1); }} disabled={i === slides.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Move down">&#x25BC;</button>
                {slides.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); removeSlide(i); }} className="text-red-400 hover:text-red-600" title="Delete">&times;</button>
                )}
              </div>
            ))}
            <button
              onClick={addSlide}
              className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-500"
            >
              + Add Slide
            </button>
          </div>

          {/* Active slide settings */}
          {activeSlide && activeLayerIndex === null && (
            <div className="space-y-3 rounded border border-gray-200 p-2">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Slide Settings
              </h4>
              {Object.entries(slideSchemas).map(([key, s]) => {
                // kenBurns only applies to image backgrounds
                if (key === 'kenBurns' && activeSlide.backgroundType !== 'image') return null;

                const field = (
                  <PropertyField
                    key={key}
                    name={key}
                    schema={s}
                    value={activeSlide[key as keyof SlideData]}
                    onChange={(v) => updateSlide(activeSlideIndex, key, v)}
                  />
                );

                // Insert the BackgroundValueEditor right after backgroundType
                if (key === 'backgroundType') {
                  return (
                    <React.Fragment key={key}>
                      {field}
                      <BackgroundValueEditor
                        bgType={activeSlide.backgroundType}
                        value={activeSlide.backgroundValue || ''}
                        onChange={(v) => updateSlide(activeSlideIndex, 'backgroundValue', v)}
                      />
                    </React.Fragment>
                  );
                }

                return field;
              })}

              {/* Layers list */}
              <div className="mt-3">
                <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Layers ({activeSlide.layers.length})
                </h4>
                <div className="space-y-1">
                  {activeSlide.layers.map((layer, li) => (
                    <div
                      key={li}
                      className="flex items-center gap-1 rounded bg-gray-50 px-2 py-1 text-xs cursor-pointer hover:bg-blue-50"
                      onClick={() => setActiveLayerIndex(li)}
                    >
                      <span className="text-gray-400">{getLayerIcon(layer.layerType)}</span>
                      <span className="flex-1 truncate text-gray-600">
                        {layer.content || layer.layerType}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeLayer(li); }}
                        className="text-red-400 hover:text-red-600"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addLayer}
                    className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-500"
                  >
                    + Add Layer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active layer editor */}
          {activeLayer && activeLayerIndex !== null && (
            <div className="space-y-3 rounded border border-blue-200 bg-blue-50/30 p-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
                  {getLayerIcon(activeLayer.layerType)} Layer: {activeLayer.content || activeLayer.layerType}
                </h4>
                <button
                  onClick={() => setActiveLayerIndex(null)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  &#x2190; Back
                </button>
              </div>
              {Object.entries(layerSchemas).map(([key, s]) => {
                // Contextual visibility
                if (key === 'imageSrc' && activeLayer.layerType !== 'image') return null;
                if (key === 'clickUrl' && activeLayer.clickAction !== 'url') return null;
                if (key === 'fontSize' && activeLayer.layerType === 'shape') return null;
                if (key === 'fontWeight' && (activeLayer.layerType === 'shape' || activeLayer.layerType === 'image')) return null;
                return (
                  <PropertyField
                    key={key}
                    name={key}
                    schema={s}
                    value={activeLayer[key as keyof LayerData]}
                    onChange={(v) => updateLayer(activeLayerIndex, key, v)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function getLayerIcon(type: string): string {
  switch (type) {
    case 'text':   return 'T';
    case 'image':  return '\u{1F5BC}';
    case 'button': return '\u{1F532}';
    case 'shape':  return '\u25A0';
    case 'icon':   return '\u2B50';
    default:       return '\u25CF';
  }
}
