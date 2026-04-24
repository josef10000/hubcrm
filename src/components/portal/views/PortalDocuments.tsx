import React from 'react';
import { motion } from 'motion/react';
import { 
  Files, 
  FileText, 
  Download, 
  Search,
  ExternalLink,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';

export default function PortalDocuments() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Files className="text-blue-400 w-6 h-6" />
            </div>
            Repositório de Documentos
          </h3>
          <p className="text-gray-500 text-sm mt-1">Acesse seus contratos, manuais e arquivos do projeto.</p>
        </div>
      </div>

      {/* Empty State / Placeholder */}
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-20 rounded-[3rem] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/10">
          <FolderOpen className="text-gray-600 w-10 h-10" />
        </div>
        <h4 className="text-xl font-bold text-white mb-2">Sua pasta está sendo organizada</h4>
        <p className="text-gray-500 max-w-sm leading-relaxed">
          Nossa equipe está finalizando a organização dos seus documentos. Em breve você encontrará aqui seus contratos e arquivos técnicos.
        </p>
      </div>

      {/* Example List (Hidden or for Future) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-40 pointer-events-none">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                <FileText className="text-gray-500" />
              </div>
              <div>
                <p className="text-white font-bold">Contrato de Prestação de Serviços.pdf</p>
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">PDF • 2.4 MB</p>
              </div>
            </div>
            <Download className="text-gray-600" />
          </div>
        ))}
      </div>
    </div>
  );
}
