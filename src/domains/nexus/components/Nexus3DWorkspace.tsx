import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useNexusStore, NexusBook, NexusNote, PersonalLink } from '@store/useNexusStore';

// === CONFIGURAÇÃO E ANIMAÇÃO DE CONSTRUÇÃO (BUILD-IN LERP PROGRESSIVO CLÁSSICO) ===
interface AnimatableProps {
  delay: number;
  targetPos: [number, number, number];
  targetRot?: [number, number, number];
  targetScale?: [number, number, number];
  children: React.ReactNode;
}

function Animatable3D({ delay, targetPos, targetRot = [0, 0, 0], targetScale = [1, 1, 1], children }: AnimatableProps) {
  const ref = useRef<THREE.Group>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStart(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useFrame(() => {
    if (ref.current) {
      if (start) {
        // Interpolação suave para a posição, rotação e escala finais (subindo majestosamente)
        ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetPos[0], 0.05);
        ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetPos[1], 0.05);
        ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, targetPos[2], 0.05);

        ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, targetRot[0], 0.05);
        ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, targetRot[1], 0.05);
        ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, targetRot[2], 0.05);

        ref.current.scale.x = THREE.MathUtils.lerp(ref.current.scale.x, targetScale[0], 0.05);
        ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, targetScale[1], 0.05);
        ref.current.scale.z = THREE.MathUtils.lerp(ref.current.scale.z, targetScale[2], 0.05);
      } else {
        // Estado inicial de construção clássica: abaixo do chão, menor e levemente inclinado
        ref.current.position.set(targetPos[0], -6, targetPos[2]);
        ref.current.rotation.set(0.4, 0.6, 0.2);
        ref.current.scale.set(0.001, 0.001, 0.001);
      }
    }
  });

  return <group ref={ref}>{children}</group>;
}

// === MODELO FÍSICO ULTRA-REALISTA DE LIVRO CLÁSSICO CAPA DURA ===
interface RealisticBookProps {
  book: NexusBook;
  idx: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  heightScale?: number;
  thicknessScale?: number;
  colorHex?: string;
  onOpen: (bookId: string) => void;
}

function RealisticBook3D({ 
  book, 
  idx, 
  position, 
  rotation = [0, 0, 0], 
  heightScale = 1.0, 
  thicknessScale = 1.0, 
  colorHex = "#780516", 
  onOpen 
}: RealisticBookProps) {
  const [hovered, setHovered] = useState(false);
  const meshGroup = useRef<THREE.Group>(null);

  // Dimensões do livro de capa dura clássico
  const height = 0.54 * heightScale;
  const thickness = 0.08 * thicknessScale;
  const depth = 0.44;

  // Animação de hover (Dá uma leve deslizada para a frente)
  useFrame(() => {
    if (meshGroup.current) {
      const targetZ = hovered ? 0.18 : 0;
      meshGroup.current.position.z = THREE.MathUtils.lerp(meshGroup.current.position.z, targetZ, 0.1);
      meshGroup.current.scale.setScalar(THREE.MathUtils.lerp(meshGroup.current.scale.x, hovered ? 1.03 : 1.0, 0.1));
    }
  });

  return (
    <group 
      ref={meshGroup} 
      position={position} 
      rotation={rotation}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onOpen(book.id); }}
    >
      {/* Capa Traseira (Capa Dura) */}
      <mesh position={[-thickness / 2 + 0.005, 0, 0]} castShadow>
        <boxGeometry args={[0.012, height + 0.02, depth + 0.01]} />
        <meshStandardMaterial color={colorHex} roughness={0.4} />
      </mesh>

      {/* Capa Frontal (Capa Dura) */}
      <mesh position={[thickness / 2 - 0.005, 0, 0]} castShadow>
        <boxGeometry args={[0.012, height + 0.02, depth + 0.01]} />
        <meshStandardMaterial color={colorHex} roughness={0.4} />
      </mesh>

      {/* Miolo de Páginas Recuadas (Cor Bege/Papel Antigo) */}
      <mesh position={[0, 0, 0.005]} castShadow>
        <boxGeometry args={[thickness - 0.014, height, depth - 0.015]} />
        <meshStandardMaterial color="#fafaf0" roughness={0.8} />
      </mesh>

      {/* Lombada Arredondada (Acabamento Clássico de Couro) */}
      <mesh position={[0, 0, -depth / 2]} rotation={[0, Math.PI, 0]} castShadow>
        <cylinderGeometry args={[thickness / 2, thickness / 2, height + 0.02, 12, 1, false, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={colorHex} roughness={0.3} />
      </mesh>

      {/* Nervuras Físicas de Couro na Lombada (3 Anéis Horizontais tridimensionais) */}
      <group position={[0, 0, -depth / 2 - 0.002]}>
        <mesh position={[0, height * 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[thickness / 2 + 0.002, 0.01, 8, 16, Math.PI]} />
          <meshStandardMaterial color={colorHex} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[thickness / 2 + 0.002, 0.01, 8, 16, Math.PI]} />
          <meshStandardMaterial color={colorHex} roughness={0.3} />
        </mesh>
        <mesh position={[0, -height * 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[thickness / 2 + 0.002, 0.01, 8, 16, Math.PI]} />
          <meshStandardMaterial color={colorHex} roughness={0.3} />
        </mesh>
      </group>

      {/* Plaqueta Metálica Dourada para Gravação de Título na Lombada */}
      <mesh position={[0, height * 0.15, -depth / 2 - thickness / 2 - 0.005]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[thickness * 0.7, 0.15, 0.01]} />
        <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.1} /> {/* Latão Dourado */}
      </mesh>

      {/* Letra/Título gravado na Plaqueta */}
      <Text
        position={[0, height * 0.15, -depth / 2 - thickness / 2 - 0.012]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.032}
        color="#1a0c07"
        fontWeight="bold"
        textAlign="center"
      >
        {book.title.substring(0, 2).toUpperCase()}
      </Text>
    </group>
  );
}

// === COMPONENTE: LUMINÁRIA BANQUEIRO DE BRONZE (BANKER LAMP CLÁSSICA) ===
interface BankerLampProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  lightColor?: string;
}

function BankerLamp3D({ position, rotation = [0, 0, 0], lightColor = "#ffeaa7" }: BankerLampProps) {
  return (
    <group position={position} rotation={rotation}>
      {/* Base da Arandela na parede de Mogno */}
      <mesh castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
        <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.1} /> {/* Bronze escovado */}
      </mesh>
      
      {/* Haste Curva de Bronze */}
      <mesh position={[0, -0.15, 0.12]} rotation={[0.4, 0, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.35, 8]} />
        <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* A Clássica Cúpula de Vidro Verde Esmeralda (Banker style) */}
      <group position={[0, -0.3, 0.22]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.15, 0.18, 16]} />
          <meshPhysicalMaterial 
            color="#065f46" 
            transmission={0.8} 
            transparent 
            opacity={0.85} 
            roughness={0.1} 
            clearcoat={1.0} 
          />
        </mesh>
        
        {/* Luz Quente e Acolhedora projeta sobre as estantes */}
        <spotLight 
          position={[0, -0.1, 0]}
          angle={0.65} 
          penumbra={0.7} 
          intensity={3.8} 
          distance={8} 
          color={lightColor} 
          castShadow 
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
        />
      </group>
    </group>
  );
}

// === COMPONENTE PRINCIPAL DA ESTANTE MONUMENTAL DE HARVARD ===
interface HarvardBookshelfProps {
  books: NexusBook[];
  onOpenBook: (bookId: string) => void;
  onOpenLinks: () => void;
  onOpenNotes: () => void;
}

function HarvardBookshelf3D({ books, onOpenBook, onOpenLinks, onOpenNotes }: HarvardBookshelfProps) {
  // Cores de Couro Clássicas Vitorianas
  const CLASSIC_COLORS = ["#780516", "#14532d", "#1e3a8a", "#3f200c", "#581c87"];

  // Distribui os livros em diferentes prateleiras
  const shelfBooks1 = books.slice(0, 10);
  const shelfBooks2 = books.slice(10, 20);
  const shelfBooks3 = books.slice(20, 30);
  
  // Elemento Lúdico: Pilha de livros horizontais (Aparador)
  const pileBooks = books.slice(0, 3);

  return (
    <group position={[0, 0, -2.0]}>
      {/* Moldura Colonial Superior da Estante */}
      <mesh position={[0, 2.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[9.4, 0.35, 1.2]} />
        <meshStandardMaterial color="#1a0c07" roughness={0.3} />
      </mesh>
      <mesh position={[0, 3.12, 0]}>
        <boxGeometry args={[9.5, 0.1, 1.24]} />
        <meshStandardMaterial color="#b45309" metalness={0.8} roughness={0.2} /> {/* Moldura de bronze no topo */}
      </mesh>

      {/* Colunas Clássicas Laterais Esculpidas */}
      {/* Esquerda */}
      <group position={[-4.5, 0, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.35, 5.8, 1.02]} />
          <meshStandardMaterial color="#1a0c07" roughness={0.3} />
        </mesh>
        {/* Canelado Clássico de Madeira */}
        <mesh position={[0.2, 0, 0.46]}>
          <cylinderGeometry args={[0.04, 0.04, 5.5, 12]} />
          <meshStandardMaterial color="#130905" roughness={0.4} />
        </mesh>
      </group>

      {/* Direita */}
      <group position={[4.5, 0, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.35, 5.8, 1.02]} />
          <meshStandardMaterial color="#1a0c07" roughness={0.3} />
        </mesh>
        {/* Canelado Clássico de Madeira */}
        <mesh position={[-0.2, 0, 0.46]}>
          <cylinderGeometry args={[0.04, 0.04, 5.5, 12]} />
          <meshStandardMaterial color="#130905" roughness={0.4} />
        </mesh>
      </group>

      {/* Separadores Internos Verticais (Duas colunas no meio) */}
      <mesh position={[-1.5, 0, 0]} castShadow>
        <boxGeometry args={[0.15, 5.5, 0.9]} />
        <meshStandardMaterial color="#1a0c07" roughness={0.3} />
      </mesh>
      <mesh position={[1.5, 0, 0]} castShadow>
        <boxGeometry args={[0.15, 5.5, 0.9]} />
        <meshStandardMaterial color="#1a0c07" roughness={0.3} />
      </mesh>

      {/* Prateleiras Monumentais de Mogno */}
      {/* Prateleira 1 (Superior - Y = 1.6) */}
      <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.8, 0.08, 0.9]} />
        <meshStandardMaterial color="#130905" roughness={0.25} />
      </mesh>
      {/* Fita de LED Neon Embutida Ouro */}
      <mesh position={[0, 1.57, -0.42]}>
        <boxGeometry args={[8.78, 0.01, 0.02]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
      </mesh>

      {/* Prateleira 2 (Meio Superior - Y = 0.5) */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.8, 0.08, 0.9]} />
        <meshStandardMaterial color="#130905" roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.47, -0.42]}>
        <boxGeometry args={[8.78, 0.01, 0.02]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
      </mesh>

      {/* Prateleira 3 (Meio Inferior - Y = -0.6) */}
      <mesh position={[0, -0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.8, 0.08, 0.9]} />
        <meshStandardMaterial color="#130905" roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.63, -0.42]}>
        <boxGeometry args={[8.78, 0.01, 0.02]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
      </mesh>

      {/* Prateleira 4 (Inferior - Y = -1.7) */}
      <mesh position={[0, -1.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.8, 0.08, 0.9]} />
        <meshStandardMaterial color="#130905" roughness={0.25} />
      </mesh>
      <mesh position={[0, -1.73, -0.42]}>
        <boxGeometry args={[8.78, 0.01, 0.02]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
      </mesh>

      {/* === RENDERIZAÇÃO DOS LIVROS CLÁSSICOS (ORGANIZAÇÃO ORGÂNICA) === */}
      
      {/* Seção 1: Prateleira Superior (Y = 1.6) */}
      {shelfBooks1.map((book, idx) => {
        // Variações de espessura e altura para cada livro
        const thickness = 0.07 + ((idx % 3) * 0.015);
        const height = 0.9 + ((idx % 2) * 0.15);
        const color = CLASSIC_COLORS[idx % CLASSIC_COLORS.length];
        
        // Posição de cada livro enfileirado na prateleira superior
        const posX = -3.8 + idx * 0.32;
        
        // Efeito de livro inclinado (apoiado no vizinho) no meio da prateleira
        const shouldLean = idx === 3 || idx === 8;
        const rotZ = shouldLean ? 0.22 : 0;
        const posY = shouldLean ? 1.88 : 1.91;

        return (
          <RealisticBook3D
            key={`shelf1-${book.id}`}
            book={book}
            idx={idx}
            position={[posX, posY, 0]}
            rotation={[0, idx % 2 === 0 ? 0.04 : -0.04, rotZ]}
            heightScale={height}
            thicknessScale={thickness}
            colorHex={color}
            onOpen={onOpenBook}
          />
        );
      })}

      {/* Seção 2: Prateleira do Meio Superior (Y = 0.5) */}
      {shelfBooks2.map((book, idx) => {
        const thickness = 0.08 + ((idx % 2) * 0.02);
        const height = 0.95 + ((idx % 3) * 0.1);
        const color = CLASSIC_COLORS[(idx + 2) % CLASSIC_COLORS.length];
        const posX = -3.6 + idx * 0.35;
        
        const isTilted = idx === 5;
        const rotZ = isTilted ? -0.24 : 0;
        const posY = isTilted ? 0.76 : 0.81;

        return (
          <RealisticBook3D
            key={`shelf2-${book.id}`}
            book={book}
            idx={idx}
            position={[posX, posY, 0]}
            rotation={[0, idx % 2 === 0 ? -0.05 : 0.05, rotZ]}
            heightScale={height}
            thicknessScale={thickness}
            colorHex={color}
            onOpen={onOpenBook}
          />
        );
      })}

      {/* Seção 3: Prateleira do Meio Inferior (Y = -0.6) */}
      {shelfBooks3.map((book, idx) => {
        const thickness = 0.075 + ((idx % 4) * 0.01);
        const height = 0.92 + ((idx % 3) * 0.12);
        const color = CLASSIC_COLORS[(idx + 4) % CLASSIC_COLORS.length];
        const posX = -3.8 + idx * 0.31;
        
        const isTilted = idx === 7;
        const rotZ = isTilted ? 0.23 : 0;
        const posY = isTilted ? -0.32 : -0.29;

        return (
          <RealisticBook3D
            key={`shelf3-${book.id}`}
            book={book}
            idx={idx}
            position={[posX, posY, 0]}
            rotation={[0, idx % 2 === 0 ? 0.03 : -0.03, rotZ]}
            heightScale={height}
            thicknessScale={thickness}
            colorHex={color}
            onOpen={onOpenBook}
          />
        );
      })}

      {/* Seção Lúdica: Pilha Horizontal de Livros (Aparador na Prateleira Inferior) */}
      {pileBooks.length > 0 && (
        <group position={[-3.6, -1.5, 0.1]}>
          {pileBooks.map((book, idx) => {
            const color = CLASSIC_COLORS[(idx + 1) % CLASSIC_COLORS.length];
            return (
              <mesh 
                key={`pile-${book.id}`} 
                position={[0, idx * 0.09, 0]} 
                rotation={[0, 0.2 - (idx * 0.1), 0]}
                onClick={(e) => { e.stopPropagation(); onOpenBook(book.id); }}
                castShadow
              >
                {/* Livro deitado */}
                <boxGeometry args={[1.0, 0.08, 0.7]} />
                <meshStandardMaterial color={color} roughness={0.3} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Elemento Interativo 2: Caderno de anotações clássico de couro (Mesa suspensa/Aparador de Mogno) */}
      <group position={[3.6, -1.66, 0.2]} onClick={onOpenNotes}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.06, 0.7]} />
          <meshStandardMaterial color="#451a03" roughness={0.3} /> {/* Capa de Couro */}
        </mesh>
        <Text position={[0, 0.032, 0]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.06} color="#fbbf24" fontWeight="bold">
          ANOTAÇÕES
        </Text>
      </group>

      {/* Elemento Interativo 3: Arquivo de Bronze para Links Rápidos (Aparador da Prateleira Inferior) */}
      <group position={[3.6, -0.4, 0.1]} onClick={onOpenLinks}>
        {/* Caixa do Arquivador */}
        <mesh castShadow>
          <boxGeometry args={[1.0, 0.32, 0.7]} />
          <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.2} />
        </mesh>
        {/* Detalhe de bronze clássico */}
        <mesh position={[0, 0, 0.355]}>
          <boxGeometry args={[0.9, 0.2, 0.01]} />
          <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.1} />
        </mesh>
        <Text position={[0, 0, 0.37]} fontSize={0.05} color="#fafafa" fontWeight="bold">
          ARQUIVADOR
        </Text>
      </group>

      {/* Fundo Gigante de Mogno Maciço da Parede de Trás */}
      <mesh position={[0, 0, -0.46]} receiveShadow>
        <boxGeometry args={[9.4, 5.8, 0.06]} />
        <meshStandardMaterial color="#160906" roughness={0.5} />
      </mesh>

      {/* Lâmpadas Banker Clássicas e Elegantes de Harvard fixadas nas estantes */}
      <BankerLamp3D position={[-2.4, 2.7, 0.42]} lightColor="#ffeaa7" />
      <BankerLamp3D position={[2.4, 2.7, 0.42]} lightColor="#ffeaa7" />
    </group>
  );
}

// === COMPONENTE PRINCIPAL DO WORKSPACE 3D ===
interface Workspace3DProps {
  onOpenBook: (bookId: string) => void;
  onOpenNote: (noteId: string) => void;
  onOpenNotesTab: () => void;
  onOpenLinksTab: () => void;
}

export function Nexus3DWorkspace({ onOpenBook, onOpenNote, onOpenNotesTab, onOpenLinksTab }: Workspace3DProps) {
  const books = useNexusStore(state => state.books);
  const notes = useNexusStore(state => state.notes);

  return (
    <div className="w-full h-full bg-[#03050a] rounded-[3.5rem] overflow-hidden border border-white/10 relative shadow-2xl">
      <Suspense fallback={
        <div className="w-full h-full flex flex-col items-center justify-center text-center gap-4 bg-[#03050a]">
          <div className="w-16 h-16 rounded-full border-t-2 border-primary-500 animate-spin" />
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Montando Biblioteca de Harvard 3D...</h3>
        </div>
      }>
        <Canvas 
          shadows 
          camera={{ position: [0, 0.2, 5.8], fov: 48 }}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Luz Ambiente Geral Clássica (Suave e aconchegante) */}
          <ambientLight intensity={0.25} color="#ffedd5" />
          
          {/* Luz da Lareira / Dourada Suave no Chão */}
          <pointLight position={[0, -3, 2]} intensity={1.5} color="#fdba74" />

          {/* Elementos Físicos e Ambientais da Estante de Harvard */}
          <Room3D />

          {/* Objeto Único Monumental com Animação de Construção (Efeito Assemble) */}
          <Animatable3D delay={100} targetPos={[0, 0, 0]}>
            <HarvardBookshelf3D 
              books={books}
              onOpenBook={onOpenBook}
              onOpenLinks={onOpenLinksTab}
              onOpenNotes={onOpenNotesTab}
            />
          </Animatable3D>

          {/* Controle de Câmera super limitado para não perder o foco na estante */}
          <OrbitControls 
            enablePan={false}
            minDistance={3.5}
            maxDistance={7.5}
            maxPolarAngle={Math.PI / 2 + 0.1} // Limita descida
            minPolarAngle={Math.PI / 2 - 0.4} // Limita subida
            maxAzimuthAngle={0.4} // Limita rotação esquerda
            minAzimuthAngle={-0.4} // Limita rotação direita
          />
        </Canvas>
      </Suspense>

      {/* HUD de Legendas Clássica e Elegante */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-950/85 backdrop-blur-md border border-amber-500/20 rounded-full px-6 py-2.5 flex items-center gap-6 text-[10px] text-amber-200 font-bold uppercase tracking-widest shadow-xl pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Arraste para explorar a estante
        </div>
        <div className="w-px h-3 bg-amber-500/20" />
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Role para zoom
        </div>
        <div className="w-px h-3 bg-amber-500/20" />
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
          Clique nos livros para abrir
        </div>
      </div>
    </div>
  );
}

// === COMPONENTE 6: MEIO AMBIENTE DA BIBLIOTECA CLÁSSICA (RODAPÉ E PISO DE CARVALHO) ===
function Room3D() {
  return (
    <group>
      {/* Piso de Madeira Nobre Carvalho Escuro */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.85, 0]} receiveShadow>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color="#1a0c07" roughness={0.25} />
      </mesh>

      {/* Tapete Clássico de Veludo Vermelho Borgonha */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.83, 1.2]} receiveShadow>
        <planeGeometry args={[8.8, 3.8]} />
        <meshPhysicalMaterial 
          color="#4c0519" 
          transmission={0.3} 
          opacity={0.85} 
          transparent 
          roughness={0.8}
        />
      </mesh>

      {/* Rodapé Colonial de Madeira */}
      <mesh position={[0, -2.7, -2.5]}>
        <boxGeometry args={[9.4, 0.3, 0.05]} />
        <meshStandardMaterial color="#1a0c07" roughness={0.3} />
      </mesh>
    </group>
  );
}
