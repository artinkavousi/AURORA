import { Pane } from 'tweakpane';
import type {
  ButtonApi,
  FolderApi,
  InputBindingApi,
  TabApi,
  TabPageApi,
} from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import type { FpsGraphBladeApi } from '@tweakpane/plugin-essentials';
import { attachGlassTheme } from './panel.theme.glass';
import { panelState } from '../state/panel.store';

export type PanelControlType =
  | 'boolean'
  | 'number'
  | 'string'
  | 'choice'
  | 'color'
  | 'button'
  | 'separator'
  | 'monitor'
  | 'search';

export interface PanelBindingDescriptor {
  path?: string;
  onChange?: (value: unknown) => void;
  onCommit?: (value: unknown) => void;
  initialValue?: unknown;
}

export type PanelActionType =
  | 'reset'
  | 'export-presets'
  | 'import-presets'
  | 'search'
  | 'custom';

export interface PanelActionDescriptor {
  type: PanelActionType;
  label?: string;
  handler?: () => void;
  prompt?: string;
}

export interface PanelControlBase {
  id: string;
  label?: string;
  description?: string;
  order?: number;
  onReady?: (api: unknown) => void;
}

export interface PanelBindingControl extends PanelControlBase {
  type: 'boolean' | 'number' | 'string' | 'choice' | 'color' | 'search';
  binding: PanelBindingDescriptor;
  ui?: {
    min?: number;
    max?: number;
    step?: number;
    options?: Array<{ text: string; value: unknown }> | Record<string, unknown>;
    format?: (value: unknown) => string;
    view?: string;
    placeholder?: string;
  };
}

export interface PanelButtonControl extends PanelControlBase {
  type: 'button';
  action: PanelActionDescriptor;
}

export interface PanelSeparatorControl extends PanelControlBase {
  type: 'separator';
}

export interface PanelMonitorControl extends PanelControlBase {
  type: 'monitor';
  blade: {
    view: string;
    lineCount?: number;
    interval?: number;
    min?: number;
    max?: number;
  };
}

export type PanelControlSchema =
  | PanelBindingControl
  | PanelButtonControl
  | PanelSeparatorControl
  | PanelMonitorControl;

export interface PanelSectionSchema {
  id: string;
  title?: string;
  order?: number;
  expanded?: boolean;
  controls: PanelControlSchema[];
}

export interface PanelTabSchema {
  id: string;
  title: string;
  icon?: string;
  order?: number;
  sections: PanelSectionSchema[];
}

export interface PanelSchema {
  id: string;
  title?: string;
  tabs: PanelTabSchema[];
}

export interface PanelOrchestratorOptions {
  container?: HTMLElement;
  title?: string;
  className?: string;
  schema?: PanelSchema;
}

interface ControlInstance {
  schema: PanelControlSchema;
  api: unknown;
  bindingTarget?: { value: unknown };
  unsubscribe?: () => void;
  signature: string;
}

interface SectionInstance {
  schema: PanelSectionSchema;
  folder: FolderApi;
  controls: Map<string, ControlInstance>;
}

interface TabInstance {
  schema: PanelTabSchema;
  page: TabPageApi;
  sections: Map<string, SectionInstance>;
}

export class PanelOrchestrator {
  private pane: Pane;
  private tabApi?: TabApi;
  private tabs = new Map<string, TabInstance>();
  private schema?: PanelSchema;

  constructor(options: PanelOrchestratorOptions = {}) {
    this.pane = new Pane({
      container: options.container,
      title: options.title ?? options.schema?.title ?? 'Aurora Controls',
      className: options.className,
    });

    (this.pane as unknown as { registerPlugin?: (bundle: unknown) => void }).registerPlugin?.(
      EssentialsPlugin as unknown
    );
    attachGlassTheme(this.pane);
    this.pane.element.classList.add('panel-orchestrator');

    if (options.schema) {
      this.applySchema(options.schema);
    }
  }

  public dispose(): void {
    this.tabs.forEach((tab) => this.disposeTab(tab));
    this.tabs.clear();
    this.tabApi?.dispose();
    this.pane.dispose();
  }

  public getPane(): Pane {
    return this.pane;
  }

  public applySchema(schema: PanelSchema): void {
    this.schema = schema;
    this.syncTabs(schema.tabs);
  }

  private ensureTabApi(): TabApi {
    if (!this.tabApi) {
      this.tabApi = this.pane.addTab({ pages: [] });
    }
    return this.tabApi;
  }

  private syncTabs(tabs: PanelTabSchema[]): void {
    const tabApi = this.ensureTabApi();
    const retained = new Set<string>();

    tabs
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((tabSchema) => {
        const existing = this.tabs.get(tabSchema.id);
        if (existing) {
          existing.schema = tabSchema;
          existing.page.title = tabSchema.title;
          this.syncSections(existing, tabSchema.sections);
          retained.add(tabSchema.id);
          return;
        }

        const page = tabApi.addPage({ title: tabSchema.title });
        const instance: TabInstance = {
          schema: tabSchema,
          page,
          sections: new Map(),
        };
        this.tabs.set(tabSchema.id, instance);
        this.syncSections(instance, tabSchema.sections);
        retained.add(tabSchema.id);
      });

    Array.from(this.tabs.keys())
      .filter((id) => !retained.has(id))
      .forEach((id) => {
        const tab = this.tabs.get(id);
        if (tab) {
          this.disposeTab(tab);
          this.tabs.delete(id);
        }
      });
  }

  private disposeTab(tab: TabInstance): void {
    tab.sections.forEach((section) => this.disposeSection(section));
    tab.sections.clear();
    tab.page.dispose();
  }

  private syncSections(tab: TabInstance, sections: PanelSectionSchema[]): void {
    const retained = new Set<string>();

    sections
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((sectionSchema) => {
        const existing = tab.sections.get(sectionSchema.id);
        if (existing) {
          existing.schema = sectionSchema;
          existing.folder.title = sectionSchema.title ?? '';
          if (typeof sectionSchema.expanded === 'boolean') {
            existing.folder.expanded = sectionSchema.expanded;
          }
          this.syncControls(existing, sectionSchema.controls);
          retained.add(sectionSchema.id);
          return;
        }

        const folder = tab.page.addFolder({
          title: sectionSchema.title ?? '',
          expanded: sectionSchema.expanded ?? false,
        });
        const instance: SectionInstance = {
          schema: sectionSchema,
          folder,
          controls: new Map(),
        };
        tab.sections.set(sectionSchema.id, instance);
        this.syncControls(instance, sectionSchema.controls);
        retained.add(sectionSchema.id);
      });

    Array.from(tab.sections.keys())
      .filter((id) => !retained.has(id))
      .forEach((id) => {
        const section = tab.sections.get(id);
        if (section) {
          this.disposeSection(section);
          tab.sections.delete(id);
        }
      });
  }

  private disposeSection(section: SectionInstance): void {
    section.controls.forEach((control) => this.disposeControl(control));
    section.controls.clear();
    section.folder.dispose();
  }

  private buildSignature(control: PanelControlSchema): string {
    return JSON.stringify({
      id: control.id,
      type: control.type,
      binding: 'binding' in control ? control.binding : undefined,
      ui: 'ui' in control ? control.ui : undefined,
      action: 'action' in control ? control.action : undefined,
      blade: 'blade' in control ? control.blade : undefined,
    });
  }

  private syncControls(section: SectionInstance, controls: PanelControlSchema[]): void {
    const retained = new Set<string>();

    controls
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((controlSchema) => {
        const existing = section.controls.get(controlSchema.id);
        const signature = this.buildSignature(controlSchema);
        if (existing && existing.signature === signature) {
          retained.add(controlSchema.id);
          return;
        }

        if (existing) {
          this.disposeControl(existing);
          section.controls.delete(controlSchema.id);
        }

        const instance = this.createControl(section.folder, controlSchema);
        section.controls.set(controlSchema.id, instance);
        retained.add(controlSchema.id);
      });

    Array.from(section.controls.keys())
      .filter((id) => !retained.has(id))
      .forEach((id) => {
        const control = section.controls.get(id);
        if (control) {
          this.disposeControl(control);
          section.controls.delete(id);
        }
      });
  }

  private disposeControl(control: ControlInstance): void {
    control.unsubscribe?.();
    if (control.api && typeof (control.api as { dispose?: () => void }).dispose === 'function') {
      (control.api as { dispose: () => void }).dispose();
    }
  }

  private createControl(folder: FolderApi, schema: PanelControlSchema): ControlInstance {
    const signature = this.buildSignature(schema);

    switch (schema.type) {
      case 'separator': {
        const api = folder.addSeparator();
        schema.onReady?.(api);
        return { schema, api, signature };
      }
      case 'button':
        return this.createButtonControl(folder, schema, signature);
      case 'monitor':
        return this.createMonitorControl(folder, schema, signature);
      case 'search':
      case 'boolean':
      case 'number':
      case 'string':
      case 'choice':
      case 'color':
        return this.createBindingControl(folder, schema, signature);
      default:
        throw new Error(`Unsupported control type: ${(schema as PanelControlSchema).type}`);
    }
  }

  private createBindingControl(
    folder: FolderApi,
    schema: PanelBindingControl,
    signature: string
  ): ControlInstance {
    const target = { value: this.resolveInitialValue(schema) };
    const bindingOptions = this.normalizeBindingOptions(schema);
    const api = folder.addBinding(target, 'value', bindingOptions) as InputBindingApi<unknown, unknown>;

    let unsubscribe: (() => void) | undefined;

    if (schema.type === 'search') {
      unsubscribe = panelState.subscribeToSearch(
        (term) => {
          target.value = term;
          api.refresh();
        },
        { fireImmediately: true }
      );
    } else if (schema.binding.path) {
      unsubscribe = panelState.subscribeToPath(
        schema.binding.path,
        (value) => {
          target.value = value;
          api.refresh();
        },
        { fireImmediately: false }
      );
    }

    api.on('change', (ev) => {
      const nextValue = (ev as { value: unknown }).value;
      if (schema.type === 'search') {
        panelState.setSearch(String(nextValue ?? ''));
      } else if (schema.binding.path) {
        panelState.setValue(schema.binding.path, nextValue);
      }
      schema.binding.onChange?.(nextValue);
    });

    api.on('finish', (ev) => {
      const nextValue = (ev as { value: unknown }).value;
      if (schema.type === 'search') {
        panelState.setSearch(String(nextValue ?? ''));
      } else if (schema.binding.path) {
        panelState.setValue(schema.binding.path, nextValue);
      }
      schema.binding.onCommit?.(nextValue);
    });

    schema.onReady?.(api);

    return {
      schema,
      api,
      bindingTarget: target,
      unsubscribe,
      signature,
    };
  }

  private resolveInitialValue(schema: PanelBindingControl): unknown {
    if (schema.type === 'search') {
      return panelState.getSearch();
    }

    if (schema.binding.path) {
      return panelState.getValue(schema.binding.path);
    }

    return schema.binding.initialValue ?? null;
  }

  private normalizeBindingOptions(schema: PanelBindingControl): Record<string, unknown> {
    const ui = schema.ui ?? {};
    const options = 'options' in ui && ui.options ? this.normalizeOptions(ui.options) : undefined;
    const base: Record<string, unknown> = {
      label: schema.label,
      view: ui.view,
      min: ui.min,
      max: ui.max,
      step: ui.step,
      placeholder: ui.placeholder,
    };

    if (options) {
      base.options = options;
    }

    if (ui.format) {
      base.format = ui.format;
    }

    return base;
  }

  private normalizeOptions(
    input: Array<{ text: string; value: unknown }> | Record<string, unknown>
  ): Record<string, unknown> {
    if (Array.isArray(input)) {
      const record: Record<string, unknown> = {};
      input.forEach((item) => {
        record[item.text] = item.value;
      });
      return record;
    }

    return input;
  }

  private createButtonControl(
    folder: FolderApi,
    schema: PanelButtonControl,
    signature: string
  ): ControlInstance {
    const api = folder.addButton({ title: schema.label ?? schema.action.label ?? schema.id }) as ButtonApi;
    api.on('click', () => this.executeAction(schema.action));
    schema.onReady?.(api);
    return { schema, api, signature };
  }

  private createMonitorControl(
    folder: FolderApi,
    schema: PanelMonitorControl,
    signature: string
  ): ControlInstance {
    const api = folder.addBlade({
      view: schema.blade.view,
      label: schema.label,
      lineCount: schema.blade.lineCount,
      min: schema.blade.min,
      max: schema.blade.max,
      interval: schema.blade.interval,
    }) as unknown as FpsGraphBladeApi;

    schema.onReady?.(api);

    return {
      schema,
      api,
      signature,
    };
  }

  private executeAction(action: PanelActionDescriptor): void {
    switch (action.type) {
      case 'reset':
        panelState.reset();
        action.handler?.();
        break;
      case 'export-presets': {
        const data = panelState.exportPresets();
        action.handler?.();
        if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
          void (navigator.clipboard as Clipboard).writeText(data).catch(() => {
            console.info('Preset export available in console output.');
          });
        }
        console.info('Aurora presets export:', data);
        break;
      }
      case 'import-presets': {
        let payload: string | null = null;
        if (typeof window !== 'undefined') {
          payload = window.prompt(action.prompt ?? 'Paste preset JSON');
        }
        if (payload) {
          try {
            panelState.importPresets(payload);
            action.handler?.();
          } catch (error) {
            console.error('Failed to import presets', error);
          }
        }
        break;
      }
      case 'search':
        action.handler?.();
        break;
      case 'custom':
        action.handler?.();
        break;
      default:
        break;
    }
  }
}

export type { FpsGraphBladeApi };
