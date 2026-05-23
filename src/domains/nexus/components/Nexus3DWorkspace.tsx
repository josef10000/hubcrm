import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useNexusStore, NexusBook, NexusNote, PersonalLink } from '@store/useNexusStore';

// === CONFIGURAÇÃO E ANIMAÇÃO DE CONSTRUÇÃO (BUILD-IN LERP PROGRESSIVO) ===
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
        ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetPos[0], 0.06);
        ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetPos[1], 0.06);
        ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, targetPos[2], 0.06);

        ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, targetRot[0], 0.06);
        ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, targetRot[1], 0.06);
        ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, targetRot[2], 0.06);

        ref.current.scale.x = THREE.MathUtils.lerp(ref.current.scale.x, targetScale[0], 0.06);
        ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, targetScale[1], 0.06);
        ref.current.scale.z = THREE.MathUtils.lerp(ref.current.scale.z, targetScale[2], 0.06);
      } else {
        // Estado inicial de construção: muito abaixo da sala e invisível
        ref.current.position.set(targetPos[0], -6, targetPos[2]);
        ref.current.rotation.set(0.6, 0.8, 0.4);
        ref.current.scale.set(0.001, 0.001, 0.001);
      }
    }
  });

  return <group ref={ref}>{children}</group>;
}

// === DECORAÇÃO: CADEIRA DE ESCRITÓRIO ERGONÔMICA 3D ===
function OfficeChair3D() {
  return (
    <group position={[0, 0, 1.25]} rotation={[0, Math.PI, 0]}>
      {/* Base da Cadeira (Pistão Metalizado) */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.3, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Pernas em Estrela (Cromado/Preto) */}
      <mesh position={[0, 0.02, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.6, 0.04, 0.08]} />
        <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[0, Math.PI / 3, 0]} castShadow>
        <boxGeometry args={[0.6, 0.04, 0.08]} />
        <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[0, -Math.PI / 3, 0]} castShadow>
        <boxGeometry args={[0.6, 0.04, 0.08]} />
        <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Assento da Cadeira (Couro Preto Ergonômico) */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.7, 0.08, 0.7]} />
        <meshStandardMaterial color="#090d16" roughness={0.7} />
      </mesh>

      {/* Haste de Suporte do Encosto */}
      <mesh position={[0, 0.65, 0.3]} castShadow>
        <boxGeometry args={[0.1, 0.4, 0.04]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Encosto da Cadeira (Couro Preto Curvado) */}
      <mesh position={[0, 0.88, 0.3]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[0.65, 0.55, 0.06]} />
        <meshStandardMaterial color="#090d16" roughness={0.7} />
      </mesh>
    </group>
  );
}

// === DECORAÇÃO: MONITORES DE VÍDEO CURVOS (ESTILO GLASSMORPHISM) ===
function DeskMonitors3D() {
  return (
    <group position={[0, 0.95, -0.7]} rotation={[0, 0, 0]}>
      {/* Haste Central de Metal */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.56, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.01, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 32]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Tela do Monitor Curva (Estilo Tela de Vidro Translúcida e Futurista) */}
      <mesh position={[0, 0.54, 0.05]} rotation={[-0.02, 0, 0]} castShadow>
        <boxGeometry args={[2.2, 0.72, 0.03]} />
        <meshPhysicalMaterial 
          color="#0f172a" 
          transmission={0.4} 
          opacity={0.8}
          transparent 
          roughness={0.1} 
          clearcoat={1.0}
        />
      </mesh>
      
      {/* Moldura de Neon Azul nas Bordas da Tela */}
      <mesh position={[0, 0.54, 0.035]}>
        <boxGeometry args={[2.22, 0.74, 0.01]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.6} />
      </mesh>

      {/* Logotipo do Hub Central Brilhando na Tela */}
      <Text
        position={[0, 0.54, 0.075]}
        fontSize={0.09}
        color="#3b82f6"
        fontWeight="bold"
        emissive="#3b82f6"
        emissiveIntensity={0.8}
      >
        HUB CENTRAL
      </Text>
      <Text
        position={[0, 0.44, 0.075]}
        fontSize={0.045}
        color="#64748b"
        fontWeight="bold"
      >
        Workspace 3D Ativo
      </Text>
    </group>
  );
}

// === DECORAÇÃO: VASO DE PLANTAS ORNAMENTAL (CRIANDO VIDA NA SALA) ===
function OfficePlant3D() {
  return (
    <group position={[5.2, 0, 3.5]}>
      {/* Vaso de Cerâmica Branca */}
      <mesh castShadow>
        <cylinderGeometry args={[0.3, 0.22, 0.76, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.1} clearcoat={1.0} />
      </mesh>
      
      {/* Terra Escura */}
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.02, 32]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </mesh>

      {/* Folhagens Decorativas (Costela-de-Adão procedural flutuando) */}
      <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.3} position={[0, 0.6, 0]}>
        <group>
          {/* Folha 1 */}
          <mesh rotation={[0.4, 0.2, -0.4]} castShadow>
            <sphereGeometry args={[0.32, 16, 16, 0, Math.PI * 2, 0, Math.PI / 3]} />
            <meshStandardMaterial color="#047857" roughness={0.6} />
          </mesh>
          {/* Folha 2 */}
          <mesh rotation={[0.3, 2.0, -0.3]} castShadow position={[0.1, 0.1, -0.1]}>
            <sphereGeometry args={[0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI / 3]} />
            <meshStandardMaterial color="#065f46" roughness={0.6} />
          </mesh>
          {/* Folha 3 */}
          <mesh rotation={[0.5, -1.8, 0.2]} castShadow position={[-0.1, 0.2, 0.1]}>
            <sphereGeometry args={[0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 3]} />
            <meshStandardMaterial color="#047857" roughness={0.6} />
          </mesh>
          {/* Folha Central Vertical */}
          <mesh rotation={[0, 0, 0]} castShadow position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#10b981" roughness={0.6} />
          </mesh>
        </group>
      </Float>
    </group>
  );
}

// === COMPONENTE 1: MESA DE TRABALHO DE LUXO ===
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
      {/* Tampo da Mesa (Madeira de Mogno Premium) */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.2, 0.1, 2.5]} />
        <meshStandardMaterial color="#2c140c" roughness={0.2} metalness={0.0} />
      </mesh>

      {/* Rodapé Metálico da Mesa (Cromado nas Bordas) */}
      <mesh position={[0, 0.84, 0]}>
        <boxGeometry args={[5.24, 0.03, 2.54]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Pernas da Mesa (Madeira Maciça nas Laterais) */}
      <mesh position={[-2.4, 0.42, 0]} castShadow>
        <boxGeometry args={[0.15, 0.86, 2.3]} />
        <meshStandardMaterial color="#2c140c" roughness={0.2} />
      </mesh>
      <mesh position={[2.4, 0.42, 0]} castShadow>
        <boxGeometry args={[0.15, 0.86, 2.3]} />
        <meshStandardMaterial color="#2c140c" roughness={0.2} />
      </mesh>

      {/* Monitores e Cadeiras Integrados na Mesa de Luxo */}
      <DeskMonitors3D />
      <OfficeChair3D />

      {/* Livros em Leitura Ativa (Dispostos de forma irregular realística) */}
      {currentlyReading.slice(0, 2).map((book, idx) => {
        const isHovered = hoveredBookId === book.id;
        const posX = idx === 0 ? -1.3 : 0.8;
        const posZ = idx === 0 ? 0.3 : -0.1;
        const rotY = idx === 0 ? 0.12 : -0.3;

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
              color={isHovered ? "#3b82f6" : (idx === 0 ? "#1e3a8a" : "#7f1d1d")} 
              roughness={0.15}
              emissive={isHovered ? "#2563eb" : "#000000"}
              emissiveIntensity={isHovered ? 0.35 : 0}
            />
            {/* Texto da Capa do Livro 3D */}
            <Text
              position={[0, 0.032, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.065}
              color="white"
              maxWidth={0.55}
              textAlign="center"
              fontWeight="bold"
            >
              {book.title.length > 15 ? book.title.substring(0, 15) + '...' : book.title}
            </Text>
          </mesh>
        );
      })}

      {/* Bloco de Notas / Caderno de Notas Rápidas (Estilo Liquid Glass) */}
      <mesh
        ref={notesRef}
        position={[-0.2, hoveredNotes ? 1.04 : 0.96, 0.4]}
        rotation={[0, -0.06, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredNotes(true); }}
        onPointerOut={() => setHoveredNotes(false)}
        onClick={(e) => { e.stopPropagation(); onOpenNotes(); }}
        castShadow
      >
        <boxGeometry args={[0.85, 0.04, 0.65]} />
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

      {/* Luminária de Mesa de Luxo (Cobre escovado) */}
      <group position={[1.8, 0.95, -0.8]}>
        {/* Base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.04, 24]} />
          <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.1} /> {/* Cobre */}
        </mesh>
        {/* Haste Curva */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 16]} />
          <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.1} />
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
          <cylinderGeometry args={[0.14, 0.24, 0.22, 24]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} />
        </mesh>
        {/* Luz Real da Luminária (Quente) */}
        {lampOn && (
          <pointLight 
            position={[0.2, 0.7, 0]} 
            intensity={2.8} 
            distance={6} 
            color="#ffeaa7" 
            castShadow 
          />
        )}
      </group>

      {/* Caneca de Café com Efeito Physical Esmaltado */}
      <group 
        position={[-1.7, 0.95, -0.2]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredCup(true); }}
        onPointerOut={() => setHoveredCup(false)}
      >
        {/* Caneca */}
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.18, 24]} />
          <meshPhysicalMaterial color="#0f172a" roughness={0.1} clearcoat={1.0} />
        </mesh>
        {/* Asa */}
        <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI/2]}>
          <torusGeometry args={[0.05, 0.015, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} />
        </mesh>
        {/* Café Interno */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.01]} />
          <meshStandardMaterial color="#3b2314" roughness={0.8} />
        </mesh>
        {/* Fumaça Animada */}
        <Float speed={2.5} rotationIntensity={0.6} floatIntensity={0.8} position={[0, 0.2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.01, 0.04, 0.15, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={hoveredCup ? 0.6 : 0.25} />
          </mesh>
        </Float>
      </group>
    </group>
  );
}

// === COMPONENTE 2: ESTANTE DE LIVROS DE VIDRO COM LEDS INTERNOS ===
interface BookshelfProps {
  books: NexusBook[];
  categories: string[];
  onOpenBook: (bookId: string) => void;
}

function Bookshelf3D({ books, categories, onOpenBook }: BookshelfProps) {
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null);

  const finishedBooks = books.filter(b => b.status === 'finished');
  const unfinishedBooks = books.filter(b => b.status !== 'finished');

  return (
    <group position={[-4.5, 1.5, -2.5]}>
      {/* Prateleiras de Vidro com Emissivo Neon Embutido */}
      {/* Prateleira 1 (Superior - Troféus / LED Dourado) */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.05, 0.7]} />
        <meshPhysicalMaterial 
          color="#ffc107" 
          transmission={0.8} 
          transparent 
          opacity={0.7} 
          roughness={0.1} 
          clearcoat={1.0}
        />
      </mesh>
      {/* Fita de LED Neon Superior */}
      <mesh position={[0, 1.17, -0.32]}>
        <boxGeometry args={[3.18, 0.01, 0.02]} />
        <meshStandardMaterial color="#ffc107" emissive="#ffc107" emissiveIntensity={0.8} />
      </mesh>
      <Text position={[0, 1.35, 0.36]} fontSize={0.11} color="#ffc107" fontWeight="bold">
        Troféus (Lidos)
      </Text>

      {/* Prateleira 2 (Meio - Geral / LED Azul) */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.05, 0.7]} />
        <meshPhysicalMaterial 
          color="#2563eb" 
          transmission={0.8} 
          transparent 
          opacity={0.7} 
          roughness={0.1} 
          clearcoat={1.0}
        />
      </mesh>
      {/* Fita de LED Neon Meio */}
      <mesh position={[0, 0.37, -0.32]}>
        <boxGeometry args={[3.18, 0.01, 0.02]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.8} />
      </mesh>

      {/* Prateleira 3 (Inferior - Referências / LED Roxo) */}
      <mesh position={[0, -0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.05, 0.7]} />
        <meshPhysicalMaterial 
          color="#8b5cf6" 
          transmission={0.8} 
          transparent 
          opacity={0.7} 
          roughness={0.1} 
          clearcoat={1.0}
        />
      </mesh>
      {/* Fita de LED Neon Inferior */}
      <mesh position={[0, -0.43, -0.32]}>
        <boxGeometry args={[3.18, 0.01, 0.02]} />
        <meshStandardMaterial color="#a78bfa" emissive="#8b5cf6" emissiveIntensity={0.8} />
      </mesh>

      {/* Livros Concluídos (Prateleira Superior - Alinhados em posições dinâmicas) */}
      {finishedBooks.slice(0, 8).map((book, idx) => {
        const isHovered = hoveredBookId === book.id;
        const posX = -1.2 + idx * 0.34;
        const rotY = idx % 2 === 0 ? 0.05 : -0.05;

        return (
          <mesh
            key={book.id}
            position={[posX, 1.5, isHovered ? 0.18 : 0]}
            rotation={[0, isHovered ? -0.18 : rotY, 0]}
            onPointerOver={(e) => { e.stopPropagation(); setHoveredBookId(book.id); }}
            onPointerOut={() => setHoveredBookId(null)}
            onClick={(e) => { e.stopPropagation(); onOpenBook(book.id); }}
            castShadow
          >
            <boxGeometry args={[0.08, 0.55, 0.45]} />
            <meshStandardMaterial 
              color={isHovered ? "#ffc107" : "#0f766e"} 
              roughness={0.1}
              metalness={0.2}
              emissive={isHovered ? "#ffd700" : "#000000"}
              emissiveIntensity={isHovered ? 0.4 : 0}
            />
          </mesh>
        );
      })}

      {/* Livros Não-Finalizados (Prateleira do Meio - Detalhes Ricos) */}
      {unfinishedBooks.slice(0, 8).map((book, idx) => {
        const isHovered = hoveredBookId === book.id;
        const posX = -1.2 + idx * 0.34;
        
        // Efeito de caimento estético se for o último da fila
        const isLast = idx === unfinishedBooks.slice(0, 8).length - 1;
        const rotZ = isLast ? 0.22 : 0;
        const posY = isLast ? 0.65 : 0.7;

        // Cores de Lombada Variadas de Luxo
        const bookColors = ["#1e3a8a", "#b91c1c", "#475569", "#701a75", "#064e3b"];
        const bookColor = bookColors[idx % bookColors.length];

        return (
          <mesh
            key={book.id}
            position={[posX, posY, isHovered ? 0.18 : 0]}
            rotation={[0, isHovered ? -0.18 : 0, rotZ]}
            onPointerOver={(e) => { e.stopPropagation(); setHoveredBookId(book.id); }}
            onPointerOut={() => setHoveredBookId(null)}
            onClick={(e) => { e.stopPropagation(); onOpenBook(book.id); }}
            castShadow
          >
            <boxGeometry args={[0.085, 0.55, 0.45]} />
            <meshStandardMaterial 
              color={isHovered ? "#3b82f6" : bookColor} 
              roughness={0.25}
              emissive={isHovered ? "#3b82f6" : "#000000"}
              emissiveIntensity={isHovered ? 0.3 : 0}
            />
          </mesh>
        );
      })}

      {/* Fundo de Madeira Maciça de Mogno da Estante */}
      <mesh position={[0, 0.4, -0.34]} receiveShadow>
        <boxGeometry args={[3.2, 2.2, 0.05]} />
        <meshStandardMaterial color="#1a0c07" roughness={0.6} />
      </mesh>
    </group>
  );
}

// === COMPONENTE 3: QUADRO DE CULTURA E NOTAS (PAREDE DO FUNDO) ===
interface CultureBoardProps {
  notes: NexusNote[];
  onOpenNote: (noteId: string) => void;
}

function CultureBoard3D({ notes, onOpenNote }: CultureBoardProps) {
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const filteredNotes = notes.slice(0, 4);

  return (
    <group position={[0, 3.2, -4.9]}>
      {/* Quadro de Vidro Líquido Profundo (Liquid Glass) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[6.8, 2.8, 0.08]} />
        <meshPhysicalMaterial 
          color="#0f172a" 
          transmission={0.6} 
          opacity={0.3} 
          transparent 
          roughness={0.1} 
          clearcoat={1.0}
        />
      </mesh>
      
      {/* Moldura de Cobre Escovado de Luxo */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[6.9, 0.05, 0.1]} />
        <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, -1.4, 0]}>
        <boxGeometry args={[6.9, 0.05, 0.1]} />
        <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-3.4, 0, 0]}>
        <boxGeometry args={[0.05, 2.8, 0.1]} />
        <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[3.4, 0, 0]}>
        <boxGeometry args={[0.05, 2.8, 0.1]} />
        <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Título com Brilho Neon */}
      <Text position={[0, 1.1, 0.06]} fontSize={0.15} color="#f8fafc" fontWeight="bold">
        Cultura & Filosofia da Empresa
      </Text>

      {/* Post-its Tridimensionais Coloridos e Clicáveis */}
      {filteredNotes.map((note, idx) => {
        const isHovered = hoveredNoteId === note.id;
        const posX = -2.2 + (idx % 2) * 4.4;
        const posY = 0.3 - Math.floor(idx / 2) * 1.0;
        const postItColors = ["#db2777", "#059669", "#7c3aed", "#d97706"]; // Rosa, Verde, Roxo, Laranja
        const noteColor = postItColors[idx % postItColors.length];

        return (
          <mesh
            key={note.id}
            position={[posX, posY, isHovered ? 0.16 : 0.05]}
            rotation={[0, 0, isHovered ? 0.05 : (idx % 2 === 0 ? 0.03 : -0.03)]}
            onPointerOver={(e) => { e.stopPropagation(); setHoveredNoteId(note.id); }}
            onPointerOut={() => setHoveredNoteId(null)}
            onClick={(e) => { e.stopPropagation(); onOpenNote(note.id); }}
            castShadow
          >
            <boxGeometry args={[1.6, 0.72, 0.02]} />
            <meshStandardMaterial 
              color={noteColor} 
              roughness={0.5}
              emissive={noteColor}
              emissiveIntensity={isHovered ? 0.3 : 0.05}
            />
            <Text
              position={[0, 0, 0.015]}
              fontSize={0.075}
              color="white"
              maxWidth={1.4}
              textAlign="center"
              fontWeight="bold"
            >
              {note.title.length > 20 ? note.title.substring(0, 20) + '...' : note.title}
            </Text>
          </mesh>
        );
      })}

      {/* Mensagem caso não haja notas */}
      {filteredNotes.length === 0 && (
        <Text position={[0, -0.2, 0.06]} fontSize={0.11} color="#475569" maxWidth={5} textAlign="center">
          Nenhuma nota corporativa vinculada ao quadro.
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
    // Abertura física suave da gaveta inferior
    const targetZ = drawerOpen ? 0.65 : 0;
    drawerZRef.current = THREE.MathUtils.lerp(drawerZRef.current, targetZ, 0.08);
  });

  return (
    <group position={[4.2, 0.8, -2.5]} rotation={[0, -0.4, 0]}>
      {/* Corpo de Luxo (Madeira Escura + Metal) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.8, 1.4]} />
        <meshStandardMaterial color="#1a0c07" roughness={0.3} />
      </mesh>
      
      {/* Lateral de Metal Cromado */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[1.64, 1.84, 1.42]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Gaveta Superior */}
      <mesh position={[0, 0.45, 0.02]} castShadow>
        <boxGeometry args={[1.5, 0.4, 1.36]} />
        <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Puxador da Gaveta Superior */}
      <mesh position={[0, 0.45, 0.7]} castShadow>
        <boxGeometry args={[0.4, 0.04, 0.04]} />
        <meshStandardMaterial color="#ffc107" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Gaveta Inferior Interativa */}
      <group 
        position={[0, -0.45, 0.02]} 
        onClick={(e) => { e.stopPropagation(); setDrawerOpen(!drawerOpen); onOpenLinks(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        {/* Movimentação em Z */}
        <mesh position={[0, 0, drawerZRef.current]} castShadow>
          <boxGeometry args={[1.5, 0.4, 1.36]} />
          <meshStandardMaterial 
            color={hovered ? "#3b82f6" : "#0f172a"} 
            metalness={hovered ? 0.8 : 0.6} 
            roughness={0.2} 
          />
        </mesh>
        
        {/* Puxador Dourado */}
        <mesh position={[0, 0, 0.7 + drawerZRef.current]}>
          <boxGeometry args={[0.4, 0.04, 0.04]} />
          <meshStandardMaterial color="#ffc107" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      <Text position={[0, 1.08, 0.1]} fontSize={0.11} color="white" fontWeight="bold">
        Arquivador
      </Text>
    </group>
  );
}

// === COMPONENTE 5: LUSTRE DE TETO MODERNO (CEILING LAMP COM LUZ DO ESCRITÓRIO) ===
function CeilingLamp3D() {
  return (
    <group position={[0, 7.8, 0]}>
      {/* Cabo de Suspensão de Metal */}
      <mesh castShadow>
        <cylinderGeometry args={[0.012, 0.012, 3.2, 8]} />
        <meshStandardMaterial color="#111" metalness={0.8} />
      </mesh>

      {/* Cúpula do Lustre Pendente (Design Contemporâneo) */}
      <mesh position={[0, -1.6, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.45, 0.35, 24]} />
        <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.4} />
      </mesh>
      
      {/* Miolo de Ouro Brilhante */}
      <mesh position={[0, -1.75, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
        <meshStandardMaterial color="#ffc107" emissive="#ffc107" emissiveIntensity={0.8} />
      </mesh>

      {/* Lâmpada de Teto Real (Spotlight focalizando sobre a mesa e projetando sombras reais!) */}
      <spotLight 
        position={[0, -1.8, 0]} 
        angle={0.65} 
        penumbra={0.8} 
        intensity={4.2} 
        distance={10} 
        color="#ffeaa7" 
        castShadow 
        shadow-mapSize-width={1024} 
        shadow-mapSize-height={1024}
      />
    </group>
  );
}

// === COMPONENTE 6: MEIO AMBIENTE DA SALA DE LUXO (PISO DE MOGNO, PAREDES E NEON spectrum) ===
function Room3D() {
  return (
    <group>
      {/* Piso de Madeira Nobre (Mogno de Luxo com reflexos refinados) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#1a0c07" roughness={0.16} metalness={0.1} />
      </mesh>

      {/* Tapete de Veludo Azul Marinho (Visual Translúcido e Quente) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0.4]} receiveShadow>
        <planeGeometry args={[7.8, 5.6]} />
        <meshPhysicalMaterial 
          color="#0b0f19" 
          transmission={0.4} 
          opacity={0.85} 
          transparent 
          roughness={0.7}
        />
      </mesh>

      {/* Parede do Fundo (Concreto Escuro / Estilo Industrial Premium) */}
      <mesh position={[0, 4, -5.8]} receiveShadow>
        <boxGeometry args={[14, 8, 0.1]} />
        <meshStandardMaterial color="#080b0f" roughness={0.85} />
      </mesh>

      {/* Rodapé Futurista LED Neon (Efeito Spectrum Azul-Turquesa e Magenta) */}
      {/* Esquerda (Azul-Turquesa) */}
      <mesh position={[-3.5, 0.15, -5.74]}>
        <boxGeometry args={[7.0, 0.06, 0.02]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.6} />
      </mesh>
      {/* Direita (Magenta/Roxo) */}
      <mesh position={[3.5, 0.15, -5.74]}>
        <boxGeometry args={[7.0, 0.06, 0.02]} />
        <meshStandardMaterial color="#d946ef" emissive="#d946ef" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

// === COMPONENTE PRINCIPAL DA CENTRAL DE COMANDO 3D ===
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
    <div className="w-full h-full bg-[#03050a] rounded-[3.5rem] overflow-hidden border border-white/10 relative shadow-2xl">
      <Suspense fallback={
        <div className="w-full h-full flex flex-col items-center justify-center text-center gap-4 bg-[#03050a]">
          <div className="w-16 h-16 rounded-full border-t-2 border-primary-500 animate-spin" />
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Modelando Escritório de Luxo 3D...</h3>
        </div>
      }>
        <Canvas 
          shadows 
          camera={{ position: [0, 4.8, 7.5], fov: 46 }}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Luz Ambiente de Preenchimento (Suave e Aconchegante) */}
          <ambientLight intensity={lampOn ? 0.3 : 0.1} color="#e2e8f0" />
          
          {/* Luz da Lâmpada de Teto Pendente (Funcional e Direcional) */}
          <CeilingLamp3D />

          {/* Luz da Luminária de Mesa (Indireta e Focalizada) */}
          <directionalLight 
            position={[-5, 7, 2]} 
            intensity={0.6} 
            castShadow 
            shadow-mapSize-width={512} 
            shadow-mapSize-height={512} 
            color="#bae6fd"
          />

          {/* Luz Neon de Aura de Fundo (Separação 3D Profunda) */}
          <pointLight position={[0, 4.5, -4.5]} intensity={0.6} color="#8b5cf6" />

          {/* Elementos Físicos e Ambientais */}
          <Room3D />
          <OfficePlant3D />

          {/* Objetos com Animação Progressiva de Construção (Efeito Assemble) */}
          {/* 1. Mesa de Trabalho de Luxo + Cadeira + Monitores (Delay: 100ms) */}
          <Animatable3D delay={100} targetPos={[0, 0, 0]}>
            <Desk3D 
              currentlyReading={readingBooks} 
              onOpenBook={onOpenBook} 
              onOpenNotes={onOpenNotesTab}
              lampOn={lampOn}
              setLampOn={setLampOn}
            />
          </Animatable3D>

          {/* 2. Estante de Livros LED de Vidro (Delay: 350ms) */}
          <Animatable3D delay={350} targetPos={[-4.5, 1.2, -2.5]} targetRot={[0, 0.4, 0]}>
            <Bookshelf3D 
              books={books} 
              categories={bookCategories} 
              onOpenBook={onOpenBook} 
            />
          </Animatable3D>

          {/* 3. Quadro de Cultura e Post-its Neon (Delay: 600ms) */}
          <Animatable3D delay={600} targetPos={[0, 3.2, -4.9]}>
            <CultureBoard3D 
              notes={notes} 
              onOpenNote={onOpenNote} 
            />
          </Animatable3D>

          {/* 4. Arquivador de Madeira e Metal (Delay: 850ms) */}
          <Animatable3D delay={850} targetPos={[4.2, 0.8, -2.5]} targetRot={[0, -0.4, 0]}>
            <Cabinet3D 
              links={links} 
              onOpenLinks={onOpenLinksTab} 
            />
          </Animatable3D>

          {/* Controle de Câmera Limitado para Evitar Perdas de Visão */}
          <OrbitControls 
            enablePan={false}
            minDistance={4}
            maxDistance={10}
            maxPolarAngle={Math.PI / 2 - 0.05} // Limita a descida abaixo do tapete
            minPolarAngle={0.1}
          />
        </Canvas>
      </Suspense>

      {/* HUD de Legenda e Interações */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-md border border-white/10 rounded-full px-6 py-2.5 flex items-center gap-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest shadow-xl pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
          Arraste para girar a sala
        </div>
        <div className="w-px h-3 bg-white/15" />
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Role para zoom
        </div>
        <div className="w-px h-3 bg-white/15" />
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Clique nos móveis para interagir
        </div>
      </div>
    </div>
  );
}
