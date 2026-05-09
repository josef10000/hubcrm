import React from 'react';
import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, TLBaseShape, BaseBoxShapeTool } from 'tldraw';
import { Building2, User } from 'lucide-react';

export type CRMCardShape = TLBaseShape<'crm-card', { 
  w: number; 
  h: number; 
  cardType: 'client' | 'deal'; 
  title: string; 
  subtitle: string;
  value?: string;
}>;

export class CRMCardShapeUtil extends BaseBoxShapeUtil<CRMCardShape> {
  static type = 'crm-card' as const;
  
  static props: RecordProps<CRMCardShape> = {
    w: T.number,
    h: T.number,
    cardType: T.string as any, // Simple validation workaround
    title: T.string,
    subtitle: T.string,
    value: T.string.optional(),
  };

  getDefaultProps(): CRMCardShape['props'] {
    return {
      w: 280,
      h: 120,
      cardType: 'deal',
      title: 'Novo Negócio',
      subtitle: 'Sem contato atribuído',
      value: 'R$ 0,00'
    };
  }

  component(shape: CRMCardShape) {
    const isDeal = shape.props.cardType === 'deal';
    
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          pointerEvents: 'all',
          display: 'flex',
          flexDirection: 'column',
          width: shape.props.w,
          height: shape.props.h,
        }}
      >
        <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${isDeal ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
              {isDeal ? <Building2 size={18} /> : <User size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">{shape.props.title}</h3>
              <p className="text-xs text-gray-500 truncate">{shape.props.subtitle}</p>
            </div>
          </div>
          {isDeal && shape.props.value && (
            <div className="mt-auto pt-2 border-t border-gray-100">
              <span className="text-sm font-bold text-gray-900">{shape.props.value}</span>
            </div>
          )}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: CRMCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />;
  }
}

// Ferramenta que desenha o Shape arrastando
export class CRMCardTool extends BaseBoxShapeTool {
  static id = 'crm-card';
  static initial = 'idle';
  shapeType = 'crm-card';
}
