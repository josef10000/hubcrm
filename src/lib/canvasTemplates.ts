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
    const sId = createShapeId();
    const wId = createShapeId();
    const oId = createShapeId();
    const tId = createShapeId();

    try {
      editor.createShapes([
        {
          id: sId,
          type: 'geo',
          x: 100,
          y: 100,
          props: {
            geo: 'rectangle',
            w: 300,
            h: 200,
            color: 'light-green',
            text: 'FORÇAS\n\n-',
          }
        },
        {
          id: wId,
          type: 'geo',
          x: 420,
          y: 100,
          props: {
            geo: 'rectangle',
            w: 300,
            h: 200,
            color: 'light-red',
            text: 'FRAQUEZAS\n\n-',
          }
        },
        {
          id: oId,
          type: 'geo',
          x: 100,
          y: 320,
          props: {
            geo: 'rectangle',
            w: 300,
            h: 200,
            color: 'light-blue',
            text: 'OPORTUNIDADES\n\n-',
          }
        },
        {
          id: tId,
          type: 'geo',
          x: 420,
          y: 320,
          props: {
            geo: 'rectangle',
            w: 300,
            h: 200,
            color: 'yellow',
            text: 'AMEAÇAS\n\n-',
          }
        }
      ]);
    } catch (e) {
      console.error("Hub Canvas: Erro ao aplicar template SWOT", e);
    }
  }

  if (templateId === 'kanban') {
    try {
      editor.createShapes([
        {
          id: createShapeId(),
          type: 'geo',
          x: 100,
          y: 100,
          props: {
            geo: 'rectangle',
            w: 250,
            h: 500,
            color: 'black',
            text: 'TODO',
          }
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: 370,
          y: 100,
          props: {
            geo: 'rectangle',
            w: 250,
            h: 500,
            color: 'blue',
            text: 'DOING',
          }
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: 640,
          y: 100,
          props: {
            geo: 'rectangle',
            w: 250,
            h: 500,
            color: 'green',
            text: 'DONE',
          }
        }
      ]);
    } catch (e) {
      console.error("Hub Canvas: Erro ao aplicar template Kanban", e);
    }
  }
}
