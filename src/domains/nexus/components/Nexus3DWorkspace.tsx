import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useNexusStore, NexusBook, NexusNote, PersonalLink } from '@store/useNexusStore';

// === CONFIGURAÇÃO E ANIMAÇÃO DE CONSTRUÇÃO (BUILD-IN LERP) ===
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
        // Interpolação suave para a posição final (subindo do chão)
        ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetPos[0], 0.08);
        ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetPos[1], 0.08);
        ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, targetPos[2], 0.08);

        // Interpolação para rotação final
        ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, targetRot[0], 0.08);
        ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, targetRot[1], 0.08);
        ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, targetRot[2], 0.08);

        // Interpolação para escala final
        ref.current.scale.x = THREE.MathUtils.lerp(ref.current.scale.x, targetScale[0], 0.08);
        ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, targetScale[1], 0.08);
        ref.current.scale.z = THREE.MathUtils.lerp(ref.current.scale.z, targetScale[2], 0.08);
      } else {
        // Estado inicial de construção: abaixo do chão, menor e levemente inclinado
        ref.current.position.set(targetPos[0], -4, targetPos[2]);
        ref.current.rotation.set(0.5, 0.5, 0.5);
        ref.current.scale.set(0.01, 0.01, 0.01);
      }
    }
  });

  return <group ref={ref}>{children}</group>;
}

// === COMPONENTE 1: MESA DE TRABALHO INTERATIVA ===
interface DeskProps {
  currentlyReading: NexusBook[];
  onOpenBook: (bookId: string) => void;
  onOpenNotes: () => void;
  lampOn: boolean;
  setLampOn: (on: boolean) => void;
}

function Desk3D({ currentlyReading, onOpenBook, onOpenNotes, lampOn, setLampOn }: DeskProps) {
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null);
  const [hoveredNotes, setHoveredNotes] = useState(false);
  const [hoveredCup, setHoveredCup] = useState(false);
  const notesRef = useRef<THREE.Mesh>(null);

  return (
    <group>
      {/* Tampo da Mesa (Madeira Escura Minimalista) */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 0.1, 2.4]} />
        <meshStandardMaterial color="#2d1f18" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Pernas da Mesa (Metal Preto) */}
      <mesh position={[-2.2, 0.45, -1.0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.9]} />
        <meshStandardMaterial color="#111" roughness={0.5} />
      </mesh>
      <mesh position={[2.2, 0.45, -1.0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.9]} />
        <meshStandardMaterial color="#111" roughness={0.5} />
      </mesh>
      <mesh position={[-2.2, 0.45, 1.0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.9]} />
        <meshStandardMaterial color="#111" roughness={0.5} />
      </mesh>
      <mesh position={[2.2, 0.45, 1.0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.9]} />
        <meshStandardMaterial color="#111" roughness={0.5} />
      </mesh>

      {/* Livros em Leitura Ativa (Deitados sobre a mesa) */}
      {currentlyReading.slice(0, 2).map((book, idx) => {
        const isHovered = hoveredBookId === book.id;
        const posX = idx === 0 ? -1.0 : 0.4;
        const posZ = idx === 0 ? 0.2 : -0.2;
        const rotY = idx === 0 ? 0.15 : -0.25;

        return (
          <mesh
            key={book.id}
            position={[posX, isHovered ? 1.08 : 0.98, posZ]}
            rotation={[0, rotY, 0]}
            onPointerOver={(e) => { e.stopPropagation(); setHoveredBookId(book.id); }}
            onPointerOut={() => setHoveredBookId(null)}
            onClick={(e) => { e.stopPropagation(); onOpenBook(book.id); }}
            castShadow
          >
            <boxGeometry args={[0.7, 0.06, 1.0]} />
            <meshStandardMaterial 
              color={isHovered ? "#3b82f6" : "#1d4ed8"} 
              roughness={0.2}
              emissive={isHovered ? "#1d4ed8" : "#000000"}
              emissiveIntensity={isHovered ? 0.3 : 0}
            />
            {/* Texto da Capa do Livro 3D */}
            <Text
              position={[0, 0.031, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.07}
              color="white"
              maxWidth={0.6}
              textAlign="center"
              font="https://fonts.gstatic.com/s/outfit/v11/Q3pwMX5abSIu8CHeMGBO.woff"
            >
              {book.title.length > 15 ? book.title.substring(0, 15) + '...' : book.title}
            </Text>
          </mesh>
        );
      })}

      {/* Bloco de Notas / Caderno de Notas Rápidas (Estilo Liquid Glass) */}
      <mesh
        ref={notesRef}
        position={[-0.2, hoveredNotes ? 1.02 : 0.96, 0.4]}
        rotation={[0, 0.05, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredNotes(true); }}
        onPointerOut={() => setHoveredNotes(false)}
        onClick={(e) => { e.stopPropagation(); onOpenNotes(); }}
        castShadow
      >
        <boxGeometry args={[0.8, 0.04, 0.6]} />
        <meshPhysicalMaterial 
          color="#ffffff" 
          transmission={0.4} 
          opacity={0.8}
          transparent 
          roughness={0.1}
          clearcoat={1.0}
        />
        <Text
          position={[0, 0.021, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.06}
          color="#1e293b"
          fontWeight="bold"
        >
          Anotações
        </Text>
      </mesh>

      {/* Luminária de Mesa (Funcional!) */}
      <group position={[1.6, 0.95, -0.6]}>
        {/* Base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.04]} />
          <meshStandardMaterial color="#ffc107" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Haste */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.8]} />
          <meshStandardMaterial color="#ffc107" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Cúpula */}
        <mesh 
          position={[0.1, 0.8, 0]} 
          rotation={[0, 0, -0.4]} 
          castShadow
          onClick={(e) => { e.stopPropagation(); setLampOn(!lampOn); }}
          onPointerOver={() => document.body.style.cursor = 'pointer'}
          onPointerOut={() => document.body.style.cursor = 'default'}
        >
          <cylinderGeometry args={[0.12, 0.22, 0.2]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} />
        </mesh>
        {/* Luz Real da Luminária */}
        {lampOn && (
          <pointLight 
            position={[0.2, 0.7, 0]} 
            intensity={2.5} 
            distance={5} 
            color="#ffeaa7" 
            castShadow 
          />
        )}
      </group>

      {/* Detalhe Lúdico: Xícara de Café */}
      <group 
        position={[-1.6, 0.95, -0.2]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredCup(true); }}
        onPointerOut={() => setHoveredCup(false)}
      >
        {/* Caneca */}
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.18]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} clearcoat={1.0} />
        </mesh>
        {/* Asa da Caneca */}
        <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI/2]}>
          <torusGeometry args={[0.05, 0.015, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} />
        </mesh>
        {/* Café Interno */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.01]} />
          <meshStandardMaterial color="#3b2314" roughness={0.8} />
        </mesh>
        {/* Fumaça Procedural (Gira suavemente) */}
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8} position={[0, 0.2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.01, 0.04, 0.15]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={hoveredCup ? 0.6 : 0.2} />
          </mesh>
        </Float>
      </group>
    </group>
  );
}

// === COMPONENTE 2: ESTANTE DE LIVROS E CATEGORIAS ===
interface BookshelfProps {
  books: NexusBook[];
  categories: string[];
  onOpenBook: (bookId: string) => void;
}

function Bookshelf3D({ books, categories, onOpenBook }: BookshelfProps) {
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null);

  // Divide livros entre finalizados (Prateleira de Cima) e não-finalizados por categoria
  const finishedBooks = books.filter(b => b.status === 'finished');
  const unfinishedBooks = books.filter(b => b.status !== 'finished');

  return (
    <group position={[-4.5, 1.5, -2.5]}>
      {/* Prateleiras de Madeira */}
      {/* Prateleira 1 (Superior - Troféus/Concluídos) */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.05, 0.7]} />
        <meshStandardMaterial color="#ffc107" roughness={0.1} metalness={0.9} /> {/* Prateleira Dourada */}
      </mesh>
      <Text position={[0, 1.35, 0.36]} fontSize={0.1} color="#ffc107" fontWeight="bold">
        Troféus (Lidos)
      </Text>

      {/* Prateleira 2 (Meio - Geral) */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.05, 0.7]} />
        <meshStandardMaterial color="#3d2a1f" roughness={0.4} />
      </mesh>
      
      {/* Prateleira 3 (Inferior - Referências) */}
      <mesh position={[0, -0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.05, 0.7]} />
        <meshStandardMaterial color="#3d2a1f" roughness={0.4} />
      </mesh>

      {/* Renderizar Livros Concluídos (Prateleira de Cima) */}
      {finishedBooks.slice(0, 8).map((book, idx) => {
        const isHovered = hoveredBookId === book.id;
        const posX = -1.2 + idx * 0.34;
        
        return (
          <mesh
            key={book.id}
            position={[posX, 1.5, isHovered ? 0.15 : 0]}
            rotation={[0, isHovered ? -0.15 : 0, isHovered ? -0.05 : 0]}
            onPointerOver={(e) => { e.stopPropagation(); setHoveredBookId(book.id); }}
            onPointerOut={() => setHoveredBookId(null)}
            onClick={(e) => { e.stopPropagation(); onOpenBook(book.id); }}
            castShadow
          >
            <boxGeometry args={[0.08, 0.55, 0.45]} />
            <meshStandardMaterial 
              color={isHovered ? "#ffc107" : "#065f46"} 
              roughness={0.1}
              metalness={0.2}
              emissive={isHovered ? "#ffd700" : "#000000"}
              emissiveIntensity={isHovered ? 0.3 : 0}
            />
          </mesh>
        );
      })}

      {/* Renderizar Livros Não-Finalizados (Prateleira do Meio) */}
      {unfinishedBooks.slice(0, 8).map((book, idx) => {
        const isHovered = hoveredBookId === book.id;
        const posX = -1.2 + idx * 0.34;
        // Efeito de caimento estético se for o último livro da prateleira
        const rotZ = idx === unfinishedBooks.slice(0, 8).length - 1 ? 0.25 : 0;

        return (
          <mesh
            key={book.id}
            position={[posX, rotZ > 0 ? 0.65 : 0.7, isHovered ? 0.15 : 0]}
            rotation={[0, isHovered ? -0.15 : 0, rotZ]}
            onPointerOver={(e) => { e.stopPropagation(); setHoveredBookId(book.id); }}
            onPointerOut={() => setHoveredBookId(null)}
            onClick={(e) => { e.stopPropagation(); onOpenBook(book.id); }}
            castShadow
          >
            <boxGeometry args={[0.08, 0.55, 0.45]} />
            <meshStandardMaterial 
              color={isHovered ? "#2563eb" : (idx % 2 === 0 ? "#b91c1c" : "#4b5563")} 
              roughness={0.3}
              emissive={isHovered ? "#2563eb" : "#000000"}
              emissiveIntensity={isHovered ? 0.2 : 0}
            />
          </mesh>
        );
      })}

      {/* Fundo decorativo da Estante */}
      <mesh position={[0, 0.4, -0.34]} receiveShadow>
        <boxGeometry args={[3.2, 2.2, 0.05]} />
        <meshStandardMaterial color="#1a110b" roughness={0.6} />
      </mesh>
    </group>
  );
}

// === COMPONENTE 3: QUADRO DE CULTURA E NOTAS (PAREDE) ===
interface CultureBoardProps {
  notes: NexusNote[];
  onOpenNote: (noteId: string) => void;
}

function CultureBoard3D({ notes, onOpenNote }: CultureBoardProps) {
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);

  // Mapeia até 4 notas da cultura ou filosofia
  const filteredNotes = notes.slice(0, 4);

  return (
    <group position={[0, 3.2, -4.9]}>
      {/* O Painel de Vidro Líquido (Liquid Glass) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[6.5, 2.8, 0.08]} />
        <meshPhysicalMaterial 
          color="#0f172a" 
          transmission={0.6} 
          opacity={0.3} 
          transparent 
          roughness={0.15} 
          clearcoat={1.0}
        />
      </mesh>
      
      {/* Moldura Metálica Fina */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[6.6, 0.05, 0.1]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>
      <mesh position={[0, -1.4, 0]}>
        <boxGeometry args={[6.6, 0.05, 0.1]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>
      <mesh position={[-3.25, 0, 0]}>
        <boxGeometry args={[0.05, 2.8, 0.1]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>
      <mesh position={[3.25, 0, 0]}>
        <boxGeometry args={[0.05, 2.8, 0.1]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      {/* Título do Painel */}
      <Text position={[0, 1.1, 0.06]} fontSize={0.14} color="#f8fafc" fontWeight="bold">
        Cultura & Filosofia da Empresa
      </Text>

      {/* Notas/Post-its no Quadro */}
      {filteredNotes.map((note, idx) => {
        const isHovered = hoveredNoteId === note.id;
        const posX = -2.0 + (idx % 2) * 4.0;
        const posY = 0.3 - Math.floor(idx / 2) * 1.0;
        const postItColors = ["#ec4899", "#10b981", "#8b5cf6", "#f59e0b"]; // Rosa, Verde, Roxo, Laranja
        const noteColor = postItColors[idx % postItColors.length];

        return (
          <mesh
            key={note.id}
            position={[posX, posY, isHovered ? 0.12 : 0.05]}
            rotation={[0, 0, isHovered ? 0.04 : (idx % 2 === 0 ? 0.02 : -0.02)]}
            onPointerOver={(e) => { e.stopPropagation(); setHoveredNoteId(note.id); }}
            onPointerOut={() => setHoveredNoteId(null)}
            onClick={(e) => { e.stopPropagation(); onOpenNote(note.id); }}
            castShadow
          >
            <boxGeometry args={[1.5, 0.7, 0.02]} />
            <meshStandardMaterial 
              color={noteColor} 
              roughness={0.6}
              emissive={noteColor}
              emissiveIntensity={isHovered ? 0.25 : 0.0}
            />
            <Text
              position={[0, 0, 0.015]}
              fontSize={0.07}
              color="white"
              maxWidth={1.3}
              textAlign="center"
              fontWeight="bold"
            >
              {note.title.length > 20 ? note.title.substring(0, 20) + '...' : note.title}
            </Text>
          </mesh>
        );
      })}

      {/* Placeholder caso não haja notas */}
      {filteredNotes.length === 0 && (
        <Text position={[0, -0.2, 0.06]} fontSize={0.1} color="#64748b" maxWidth={5} textAlign="center">
          Nenhuma nota corporativa vinculada ainda.
        </Text>
      )}
    </group>
  );
}

// === COMPONENTE 4: ARQUIVADOR E PASTAS DE LINKS ===
interface CabinetProps {
  links: PersonalLink[];
  onOpenLinks: () => void;
}

function Cabinet3D({ links, onOpenLinks }: CabinetProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const drawerZRef = useRef(0);

  useFrame(() => {
    // Interpolação para abrir/fechar a gaveta do arquivador fisicamente
    const targetZ = drawerOpen ? 0.6 : 0;
    drawerZRef.current = THREE.MathUtils.lerp(drawerZRef.current, targetZ, 0.1);
  });

  return (
    <group position={[4.2, 0.8, -2.5]} rotation={[0, -0.4, 0]}>
      {/* Corpo do Arquivador */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.8, 1.4]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Gaveta Superior Decorativa */}
      <mesh position={[0, 0.45, 0.02]}>
        <boxGeometry args={[1.5, 0.38, 1.36]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Puxador da Gaveta Superior */}
      <mesh position={[0, 0.45, 0.7]}>
        <boxGeometry args={[0.4, 0.04, 0.04]} />
        <meshStandardMaterial color="#ffc107" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Gaveta Inferior Interativa (Funcional!) */}
      <group 
        position={[0, -0.45, 0.02]} 
        onClick={(e) => { e.stopPropagation(); setDrawerOpen(!drawerOpen); onOpenLinks(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        {/* A Gaveta em Si (Move em Z) */}
        <mesh position={[0, 0, drawerZRef.current]} castShadow>
          <boxGeometry args={[1.5, 0.38, 1.36]} />
          <meshStandardMaterial 
            color={hovered ? "#3b82f6" : "#1e293b"} 
            metalness={0.5} 
            roughness={0.3} 
          />
        </mesh>
        
        {/* Puxador da Gaveta Inferior */}
        <mesh position={[0, 0, 0.7 + drawerZRef.current]}>
          <boxGeometry args={[0.4, 0.04, 0.04]} />
          <meshStandardMaterial color="#ffc107" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      <Text position={[0, 1.05, 0.1]} fontSize={0.1} color="white" fontWeight="bold">
        Arquivador
      </Text>
    </group>
  );
}

// === COMPONENTE 5: MEIO AMBIENTE (CHÃO, PAREDES E TAPETE) ===
function Room3D() {
  return (
    <group>
      {/* Chão (Madeira Escura) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#1e1814" roughness={0.5} />
      </mesh>

      {/* Tapete Futurista (Abaixo da mesa) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[7, 5]} />
        <meshPhysicalMaterial 
          color="#0f172a" 
          transmission={0.4} 
          opacity={0.7} 
          transparent 
          roughness={0.6}
        />
      </mesh>

      {/* Parede do Fundo */}
      <mesh position={[0, 4, -5.8]} receiveShadow>
        <boxGeometry args={[14, 8, 0.1]} />
        <meshStandardMaterial color="#070a0f" roughness={0.9} />
      </mesh>

      {/* Rodapé Moderno */}
      <mesh position={[0, 0.15, -5.74]}>
        <boxGeometry args={[14, 0.3, 0.02]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

// === COMPONENTE PRINCIPAL DO CANVASES 3D ===
interface Workspace3DProps {
  onOpenBook: (bookId: string) => void;
  onOpenNote: (noteId: string) => void;
  onOpenNotesTab: () => void;
  onOpenLinksTab: () => void;
}

export function Nexus3DWorkspace({ onOpenBook, onOpenNote, onOpenNotesTab, onOpenLinksTab }: Workspace3DProps) {
  const books = useNexusStore(state => state.books);
  const notes = useNexusStore(state => state.notes);
  const bookCategories = useNexusStore(state => state.bookCategories);
  const links = useNexusStore(state => state.links);
  const [lampOn, setLampOn] = useState(true);

  // Filtra livros que estão "lendo"
  const readingBooks = books.filter(b => b.status === 'reading');

  return (
    <div className="w-full h-full bg-[#030712] rounded-[3.5rem] overflow-hidden border border-white/10 relative shadow-2xl">
      <Suspense fallback={
        <div className="w-full h-full flex flex-col items-center justify-center text-center gap-4 bg-[#030712]">
          <div className="w-16 h-16 rounded-full border-t-2 border-primary-500 animate-spin" />
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Montando Escritório 3D...</h3>
        </div>
      }>
        <Canvas 
          shadows 
          camera={{ position: [0, 4.5, 6.5], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Luz Ambiente Geral (Suave e Quente) */}
          <ambientLight intensity={lampOn ? 0.35 : 0.15} color="#e0f2fe" />
          
          {/* Luz Direcional (Simulando uma Janela no teto/lateral) */}
          <directionalLight 
            position={[-5, 8, 3]} 
            intensity={1.2} 
            castShadow 
            shadow-mapSize-width={1024} 
            shadow-mapSize-height={1024} 
            color="#bae6fd"
          />

          {/* Luz de Preenchimento Sutil no Fundo */}
          <pointLight position={[0, 4, -3]} intensity={0.4} color="#8b5cf6" />

          {/* Elementos da Sala 3D */}
          <Room3D />

          {/* Objetos com Animações de Construção / Delay Progressivo */}
          {/* 1. Mesa de Trabalho (Delay: 100ms) */}
          <Animatable3D delay={100} targetPos={[0, 0, 0]}>
            <Desk3D 
              currentlyReading={readingBooks} 
              onOpenBook={onOpenBook} 
              onOpenNotes={onOpenNotesTab}
              lampOn={lampOn}
              setLampOn={setLampOn}
            />
          </Animatable3D>

          {/* 2. Estante de Livros (Delay: 300ms) */}
          <Animatable3D delay={300} targetPos={[-4.5, 1.2, -2.5]} targetRot={[0, 0.4, 0]}>
            <Bookshelf3D 
              books={books} 
              categories={bookCategories} 
              onOpenBook={onOpenBook} 
            />
          </Animatable3D>

          {/* 3. Quadro de Cultura (Delay: 500ms) */}
          <Animatable3D delay={500} targetPos={[0, 3.2, -4.9]}>
            <CultureBoard3D 
              notes={notes} 
              onOpenNote={onOpenNote} 
            />
          </Animatable3D>

          {/* 4. Arquivador/Gaveteiro (Delay: 700ms) */}
          <Animatable3D delay={700} targetPos={[4.2, 0.8, -2.5]} targetRot={[0, -0.4, 0]}>
            <Cabinet3D 
              links={links} 
              onOpenLinks={onOpenLinksTab} 
            />
          </Animatable3D>

          {/* Controles da Câmera (Orbitais e limitados para uma experiência perfeita) */}
          <OrbitControls 
            enablePan={false}
            minDistance={4}
            maxDistance={9}
            maxPolarAngle={Math.PI / 2 - 0.05} // Não deixa a câmera descer abaixo do chão
            minPolarAngle={0.1}
          />
        </Canvas>
      </Suspense>

      {/* Legenda/Guia flutuante e translúcido */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-full px-6 py-2 flex items-center gap-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest shadow-lg pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
          Clique e arraste para girar a sala
        </div>
        <div className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Role para dar zoom
        </div>
        <div className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Clique nos objetos para abrir
        </div>
      </div>
    </div>
  );
}
