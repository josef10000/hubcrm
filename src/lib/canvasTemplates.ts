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
          color: 'green',
          fill: 'semi',
          text: 'FORÇAS\n\n-',
          align: 'start'
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
          color: 'red',
          fill: 'semi',
          text: 'FRAQUEZAS\n\n-',
          align: 'start'
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
          color: 'blue',
          fill: 'semi',
          text: 'OPORTUNIDADES\n\n-',
          align: 'start'
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
          fill: 'semi',
          text: 'AMEAÇAS\n\n-',
          align: 'start'
        }
      }
    ]);
  }

  if (templateId === 'kanban') {
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
          fill: 'solid',
          text: 'TODO',
          align: 'middle'
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
          fill: 'solid',
          text: 'DOING',
          align: 'middle'
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
          fill: 'solid',
          text: 'DONE',
          align: 'middle'
        }
      }
    ]);
  }
}
