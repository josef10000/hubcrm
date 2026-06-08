import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Calculator, Briefcase } from 'lucide-react';
import PortalInventory from '../components/PortalInventory';
import PortalCalculator from '../components/PortalCalculator';

interface PortalManagementProps {
  orgId: string;
  clientId: string;
}

export default function PortalManagement({ orgId, clientId }: PortalManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'calculator'>('inventory');

  const subTabs = [
    { id: 'inventory', label: 'Estoque de Insumos', icon: Package },
    { id: 'calculator', label: 'Calculadora de Orçamentos', icon: Calculator }
  ] as const;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-xl">
              <Briefcase className="text-primary-400 w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            Meu Negócio
          </h3>
          <p className="text-gray-500 text-xs lg:text-sm mt-1">
            Gerencie o estoque de insumos e simule orçamentos operacionais com facilidade.
          </p>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-white/10 gap-2 md:gap-4 overflow-x-auto pb-px scrollbar-none">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-bold transition-all whitespace-nowrap relative
                ${isActive 
                  ? 'border-primary-500 text-primary-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-300'}
              `}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeSubTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Component Area */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            {activeSubTab === 'inventory' && (
              <PortalInventory orgId={orgId} />
            )}
            {activeSubTab === 'calculator' && (
              <PortalCalculator orgId={orgId} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
