import { createShapeId, Editor } from 'tldraw';

export const CANVAS_TEMPLATES = [
  { id: 'blank', name: 'Em Branco' },
  { id: 'swot', name: 'Análise SWOT' },
  { id: 'kanban', name: 'Kanban Básico' }
] as const;

export type CanvasTemplateId = typeof CANVAS_TEMPLATES[number]['id'];

export function applyTemplate(editor: Editor, templateId: CanvasTemplateId) {
  if (templateId === 'blank') return;

  if (templateId === 'swot') {
    try {
      editor.createShapes([
        { id: createShapeId(), type: 'geo', x: 100, y: 100, props: { geo: 'rectangle', w: 300, h: 200, color: 'light-green' } },
        { id: createShapeId(), type: 'text', x: 120, y: 120, props: { text: 'FORÇAS' } },
        
        { id: createShapeId(), type: 'geo', x: 420, y: 100, props: { geo: 'rectangle', w: 300, h: 200, color: 'light-red' } },
        { id: createShapeId(), type: 'text', x: 440, y: 120, props: { text: 'FRAQUEZAS' } },
        
        { id: createShapeId(), type: 'geo', x: 100, y: 320, props: { geo: 'rectangle', w: 300, h: 200, color: 'light-blue' } },
        { id: createShapeId(), type: 'text', x: 120, y: 340, props: { text: 'OPORTUNIDADES' } },
        
        { id: createShapeId(), type: 'geo', x: 420, y: 320, props: { geo: 'rectangle', w: 300, h: 200, color: 'yellow' } },
        { id: createShapeId(), type: 'text', x: 440, y: 340, props: { text: 'AMEAÇAS' } }
      ]);
    } catch (e) {
      console.error("Hub Canvas: Erro ao aplicar template SWOT", e);
    }
  }

  if (templateId === 'kanban') {
    try {
      editor.createShapes([
        { id: createShapeId(), type: 'geo', x: 100, y: 100, props: { geo: 'rectangle', w: 250, h: 500, color: 'black' } },
        { id: createShapeId(), type: 'text', x: 180, y: 120, props: { text: 'TODO' } },
        
        { id: createShapeId(), type: 'geo', x: 370, y: 100, props: { geo: 'rectangle', w: 250, h: 500, color: 'blue' } },
        { id: createShapeId(), type: 'text', x: 445, y: 120, props: { text: 'DOING' } },
        
        { id: createShapeId(), type: 'geo', x: 640, y: 100, props: { geo: 'rectangle', w: 250, h: 500, color: 'green' } },
        { id: createShapeId(), type: 'text', x: 720, y: 120, props: { text: 'DONE' } }
      ]);
    } catch (e) {
      console.error("Hub Canvas: Erro ao aplicar template Kanban", e);
    }
  }
}
