'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';

// Form Builder uses the settings key-value store for form definitions
// Each form is stored as settings key: `form_<formId>`
// A form registry is stored at settings key: `forms_registry`

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' | 'date' | 'number' | 'url' | 'hidden';
  label: string;
  name: string;
  placeholder: string;
  required: boolean;
  width: 'full' | 'half';
  options: string[];    // for select, radio, checkbox
  validation: string;   // regex pattern
  defaultValue: string;
  helpText: string;
}

interface FormDefinition {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  submitButtonText: string;
  successMessage: string;
  successRedirect: string;
  notifyEmail: string;
  honeypot: boolean;
  requireConsent: boolean;
  consentText: string;
  salesforceEnabled: boolean;
  salesforceObjectType: string;      // Lead, Contact, Case, custom__c
  salesforceFieldMapping: SalesforceFieldMapping[];
  gatedAssetId: string;             // link to gated file — on submit, user gets download access
  status: 'active' | 'inactive';
  createdAt: string;
}

interface SalesforceFieldMapping {
  formField: string;   // form field name
  sfField: string;     // Salesforce field API name
}

interface FormsRegistry {
  forms: { id: string; name: string; status: string; createdAt: string }[];
}

function genId() {
  return `form-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function genFieldId() {
  return `fld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File Upload' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'url', label: 'URL' },
  { value: 'hidden', label: 'Hidden' },
];

const SF_OBJECTS = [
  { value: 'Lead', label: 'Lead' },
  { value: 'Contact', label: 'Contact' },
  { value: 'Case', label: 'Case' },
  { value: 'custom__c', label: 'Custom Object' },
];

const DEFAULT_FORM: Omit<FormDefinition, 'id' | 'createdAt'> = {
  name: '',
  description: '',
  fields: [],
  submitButtonText: 'Submit',
  successMessage: 'Thank you for your submission!',
  successRedirect: '',
  notifyEmail: '',
  honeypot: true,
  requireConsent: false,
  consentText: 'I agree to the terms and privacy policy',
  salesforceEnabled: false,
  salesforceObjectType: 'Lead',
  salesforceFieldMapping: [],
  gatedAssetId: '',
  status: 'active',
};

export default function FormsPage() {
  const queryClient = useQueryClient();
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);
  const [activeTab, setActiveTab] = useState<'fields' | 'settings' | 'salesforce'>('fields');
  const [expandedField, setExpandedField] = useState<string | null>(null);

  // Load forms registry
  const { data: registry, isLoading } = useQuery({
    queryKey: ['settings', 'forms_registry'],
    queryFn: () => settingsApi.get('forms_registry').catch(() => ({ forms: [] })),
  });

  // Load gated files for the asset picker
  const { data: gatedFilesStore } = useQuery({
    queryKey: ['settings', 'gated_files'],
    queryFn: () => settingsApi.get('gated_files').catch(() => ({ files: [] })),
  });
  const gatedFiles: Array<{ id: string; name: string; fileName: string; category: string }> =
    gatedFilesStore?.files || [];

  const forms: FormsRegistry['forms'] = registry?.forms || [];

  // Save form mutation
  const saveMutation = useMutation({
    mutationFn: async (form: FormDefinition) => {
      // Save form definition
      await settingsApi.update(`form_${form.id}`, form as any);
      // Update registry
      const currentRegistry: FormsRegistry = registry || { forms: [] };
      const existingIdx = currentRegistry.forms.findIndex((f) => f.id === form.id);
      const entry = { id: form.id, name: form.name, status: form.status, createdAt: form.createdAt };
      if (existingIdx >= 0) {
        currentRegistry.forms[existingIdx] = entry;
      } else {
        currentRegistry.forms.push(entry);
      }
      await settingsApi.update('forms_registry', currentRegistry as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Form saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (formId: string) => {
      const currentRegistry: FormsRegistry = registry || { forms: [] };
      currentRegistry.forms = currentRegistry.forms.filter((f) => f.id !== formId);
      await settingsApi.update('forms_registry', currentRegistry as any);
      // Note: form_<id> key remains but is orphaned; can be cleaned up later
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Form deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createNewForm = () => {
    const id = genId();
    const form: FormDefinition = {
      ...DEFAULT_FORM,
      id,
      name: 'New Form',
      createdAt: new Date().toISOString(),
    };
    setEditingForm(form);
    setActiveTab('fields');
  };

  const loadForm = async (formId: string) => {
    try {
      const data = await settingsApi.get(`form_${formId}`);
      setEditingForm(data);
      setActiveTab('fields');
    } catch {
      toast.error('Failed to load form');
    }
  };

  const updateForm = (updates: Partial<FormDefinition>) => {
    if (!editingForm) return;
    setEditingForm({ ...editingForm, ...updates });
  };

  // Field operations
  const addField = () => {
    if (!editingForm) return;
    const field: FormField = {
      id: genFieldId(),
      type: 'text',
      label: 'New Field',
      name: '',
      placeholder: '',
      required: false,
      width: 'full',
      options: [],
      validation: '',
      defaultValue: '',
      helpText: '',
    };
    updateForm({ fields: [...editingForm.fields, field] });
    setExpandedField(field.id);
  };

  const removeField = (fieldId: string) => {
    if (!editingForm) return;
    updateForm({ fields: editingForm.fields.filter((f) => f.id !== fieldId) });
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    if (!editingForm) return;
    updateForm({
      fields: editingForm.fields.map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f,
      ),
    });
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    if (!editingForm) return;
    const idx = editingForm.fields.findIndex((f) => f.id === fieldId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= editingForm.fields.length) return;
    const newFields = [...editingForm.fields];
    const a = newFields[idx];
    const b = newFields[newIdx];
    if (!a || !b) return;
    [newFields[idx], newFields[newIdx]] = [b, a];
    updateForm({ fields: newFields });
  };

  // Auto-generate field name from label
  const handleLabelChange = (fieldId: string, label: string) => {
    const name = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
    updateField(fieldId, { label, name });
  };

  // Salesforce field mapping
  const addSfMapping = () => {
    if (!editingForm) return;
    updateForm({
      salesforceFieldMapping: [
        ...editingForm.salesforceFieldMapping,
        { formField: '', sfField: '' },
      ],
    });
  };

  const updateSfMapping = (idx: number, updates: Partial<SalesforceFieldMapping>) => {
    if (!editingForm) return;
    const mappings = [...editingForm.salesforceFieldMapping];
    mappings[idx] = { ...(mappings[idx] ?? { formField: '', sfField: '' }), ...updates };
    updateForm({ salesforceFieldMapping: mappings });
  };

  const removeSfMapping = (idx: number) => {
    if (!editingForm) return;
    updateForm({
      salesforceFieldMapping: editingForm.salesforceFieldMapping.filter((_, i) => i !== idx),
    });
  };

  // ─── Form List View ───
  if (!editingForm) {
    return (
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
            <p className="mt-1 text-sm text-gray-500">
              Build forms, manage submissions, and integrate with Salesforce
            </p>
          </div>
          <button
            onClick={createNewForm}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Form
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          </div>
        ) : forms.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-16 text-center">
            <p className="text-sm text-gray-400">No forms created yet</p>
            <button
              onClick={createNewForm}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Create your first form
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <div key={form.id} className="rounded-lg bg-white p-5 shadow hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">{form.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    form.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {form.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Created {new Date(form.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadForm(form.id)}
                    className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this form?')) deleteMutation.mutate(form.id);
                    }}
                    className="rounded-md px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`<FormEmbed formId="${form.id}" />`);
                      toast.success('Embed code copied');
                    }}
                    className="ml-auto rounded-md px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
                  >
                    Copy Embed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Form Editor View ───
  return (
    <div className="p-8">
      {/* Editor Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setEditingForm(null)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back
          </button>
          <input
            type="text"
            value={editingForm.name}
            onChange={(e) => updateForm({ name: e.target.value })}
            className="text-xl font-bold text-gray-900 border-none bg-transparent focus:outline-none focus:ring-0 p-0"
            placeholder="Form Name"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={editingForm.status}
            onChange={(e) => updateForm({ status: e.target.value as 'active' | 'inactive' })}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={() => saveMutation.mutate(editingForm)}
            disabled={saveMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Form'}
          </button>
        </div>
      </div>

      {/* Editor Tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {(['fields', 'settings', 'salesforce'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'salesforce' ? 'Salesforce Integration' : tab}
          </button>
        ))}
      </div>

      <div className="max-w-3xl">
        {/* ── Fields Tab ── */}
        {activeTab === 'fields' && (
          <div className="space-y-3">
            {editingForm.fields.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
                <p className="text-sm text-gray-400">No fields added yet</p>
                <button onClick={addField} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Add your first field
                </button>
              </div>
            ) : (
              editingForm.fields.map((field, idx) => {
                const isExpanded = expandedField === field.id;
                return (
                  <div key={field.id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                    {/* Field header */}
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedField(isExpanded ? null : field.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveField(field.id, 'up'); }}
                            disabled={idx === 0}
                            className="text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveField(field.id, 'down'); }}
                            disabled={idx === editingForm.fields.length - 1}
                            className="text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-800">{field.label || 'Untitled Field'}</span>
                          <span className="ml-2 text-[10px] text-gray-400 uppercase">{field.type}</span>
                          {field.required && <span className="ml-1 text-red-400 text-xs">*</span>}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Field editor */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 py-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Label</label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => handleLabelChange(field.id, e.target.value)}
                              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Field Name</label>
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) => updateField(field.id, { name: e.target.value })}
                              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-mono focus:border-blue-400 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Type</label>
                            <select
                              value={field.type}
                              onChange={(e) => updateField(field.id, { type: e.target.value as FormField['type'] })}
                              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                            >
                              {FIELD_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Width</label>
                            <select
                              value={field.width}
                              onChange={(e) => updateField(field.id, { width: e.target.value as 'full' | 'half' })}
                              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                            >
                              <option value="full">Full Width</option>
                              <option value="half">Half Width</option>
                            </select>
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer pb-1.5">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
                              />
                              Required
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Placeholder</label>
                          <input
                            type="text"
                            value={field.placeholder}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                          />
                        </div>
                        {['select', 'radio', 'checkbox'].includes(field.type) && (
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">
                              Options (one per line)
                            </label>
                            <textarea
                              value={field.options.join('\n')}
                              onChange={(e) => updateField(field.id, { options: e.target.value.split('\n') })}
                              rows={3}
                              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                              placeholder="Option 1&#10;Option 2&#10;Option 3"
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Default Value</label>
                            <input
                              type="text"
                              value={field.defaultValue}
                              onChange={(e) => updateField(field.id, { defaultValue: e.target.value })}
                              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Validation Pattern</label>
                            <input
                              type="text"
                              value={field.validation}
                              onChange={(e) => updateField(field.id, { validation: e.target.value })}
                              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-mono focus:border-blue-400 focus:outline-none"
                              placeholder="regex pattern"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Help Text</label>
                          <input
                            type="text"
                            value={field.helpText}
                            onChange={(e) => updateField(field.id, { helpText: e.target.value })}
                            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder="Displayed below the field"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <button
              onClick={addField}
              className="w-full rounded-lg border-2 border-dashed border-gray-200 py-3 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
            >
              + Add Field
            </button>
          </div>
        )}

        {/* ── Settings Tab ── */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Form Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editingForm.description}
                    onChange={(e) => updateForm({ description: e.target.value })}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Internal description for this form"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Submit Button Text</label>
                  <input
                    type="text"
                    value={editingForm.submitButtonText}
                    onChange={(e) => updateForm({ submitButtonText: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notification Email</label>
                  <input
                    type="email"
                    value={editingForm.notifyEmail}
                    onChange={(e) => updateForm({ notifyEmail: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="admin@example.com"
                  />
                  <p className="mt-1 text-[10px] text-gray-400">Receive an email on each submission</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Success Behavior</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Success Message</label>
                  <textarea
                    value={editingForm.successMessage}
                    onChange={(e) => updateForm({ successMessage: e.target.value })}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Redirect URL (optional)</label>
                  <input
                    type="text"
                    value={editingForm.successRedirect}
                    onChange={(e) => updateForm({ successRedirect: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="/thank-you"
                  />
                  <p className="mt-1 text-[10px] text-gray-400">Redirect to this URL instead of showing the success message</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Spam Protection & Consent</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingForm.honeypot}
                    onChange={(e) => updateForm({ honeypot: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
                  />
                  Enable honeypot spam protection
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingForm.requireConsent}
                    onChange={(e) => updateForm({ requireConsent: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
                  />
                  Require consent checkbox before submit
                </label>
                {editingForm.requireConsent && (
                  <div className="ml-6">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Consent Text</label>
                    <input
                      type="text"
                      value={editingForm.consentText}
                      onChange={(e) => updateForm({ consentText: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Gated Content</h2>
              <p className="text-xs text-gray-500 mb-4">
                Link a file from gated storage. Users get download access after submitting this form.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gated File</label>
                <select
                  value={editingForm.gatedAssetId}
                  onChange={(e) => updateForm({ gatedAssetId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">No gated content</option>
                  {gatedFiles.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.name} ({file.fileName})
                    </option>
                  ))}
                </select>
                {gatedFiles.length === 0 && (
                  <p className="mt-1 text-[10px] text-amber-600">
                    No gated files found. Create one in Content &rarr; Gated Files first.
                  </p>
                )}
                {editingForm.gatedAssetId && (
                  <p className="mt-1 text-[10px] text-gray-400">
                    After submitting this form, users will be granted access to download the selected file.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Salesforce Tab ── */}
        {activeTab === 'salesforce' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Salesforce Integration</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Push form submissions to Salesforce as Leads, Contacts, or Cases
                  </p>
                </div>
                <button
                  onClick={() => updateForm({ salesforceEnabled: !editingForm.salesforceEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editingForm.salesforceEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                  role="switch"
                  aria-checked={editingForm.salesforceEnabled}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${editingForm.salesforceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {editingForm.salesforceEnabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Salesforce Object</label>
                    <select
                      value={editingForm.salesforceObjectType}
                      onChange={(e) => updateForm({ salesforceObjectType: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      {SF_OBJECTS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {editingForm.salesforceObjectType === 'custom__c' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Custom Object API Name</label>
                      <input
                        type="text"
                        value={editingForm.salesforceObjectType}
                        onChange={(e) => updateForm({ salesforceObjectType: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="My_Object__c"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {editingForm.salesforceEnabled && (
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Field Mapping</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Map form fields to Salesforce {editingForm.salesforceObjectType} fields
                    </p>
                  </div>
                  <button
                    onClick={addSfMapping}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Add Mapping
                  </button>
                </div>

                {editingForm.salesforceFieldMapping.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 py-6 text-center">
                    <p className="text-sm text-gray-400">No field mappings configured</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-5 gap-2 px-1 text-[10px] font-medium text-gray-400 uppercase">
                      <div className="col-span-2">Form Field</div>
                      <div className="col-span-2">Salesforce Field</div>
                      <div></div>
                    </div>
                    {editingForm.salesforceFieldMapping.map((mapping, idx) => (
                      <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                        <div className="col-span-2">
                          <select
                            value={mapping.formField}
                            onChange={(e) => updateSfMapping(idx, { formField: e.target.value })}
                            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                          >
                            <option value="">Select field...</option>
                            {editingForm.fields.map((f) => (
                              <option key={f.id} value={f.name}>{f.label} ({f.name})</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={mapping.sfField}
                            onChange={(e) => updateSfMapping(idx, { sfField: e.target.value })}
                            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-mono focus:border-blue-400 focus:outline-none"
                            placeholder={editingForm.salesforceObjectType === 'Lead' ? 'e.g., LastName, Email, Company' : 'SF API Name'}
                          />
                        </div>
                        <div>
                          <button
                            onClick={() => removeSfMapping(idx)}
                            className="text-[10px] text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-3">
                  <p className="text-[11px] text-blue-700">
                    <strong>Tip:</strong> Salesforce connection credentials are configured in Settings &rarr; System.
                    Common Lead fields: <code className="text-[10px] bg-blue-100 px-1 rounded">FirstName</code>, <code className="text-[10px] bg-blue-100 px-1 rounded">LastName</code>, <code className="text-[10px] bg-blue-100 px-1 rounded">Email</code>, <code className="text-[10px] bg-blue-100 px-1 rounded">Company</code>, <code className="text-[10px] bg-blue-100 px-1 rounded">Phone</code>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
