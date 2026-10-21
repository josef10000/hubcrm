import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Client } from '@/types';

interface InteractiveSalesGlobeProps {
  clients?: Client[];
}

export function InteractiveSalesGlobe({ clients = [] }: InteractiveSalesGlobeProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // Computa métricas reais
  const activeClients = (clients || []).filter(c => c.status === 'Ativo' || c.paymentStatus === 'RECEIVED');
  const totalRevenue = activeClients.reduce((acc, c) => acc + (Number(c.customMonthlyPrice) || 0), 0);
  const totalCount = activeClients.length;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 580;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Luzes
    const ambientLight = new THREE.AmbientLight(0x0f2b48, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2.5);
    dirLight1.position.set(5, 3, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf59e0b, 1.2);
    dirLight2.position.set(-5, -2, -3);
    scene.add(dirLight2);

    // 3. Textura da Terra Realista Gerada Proceduralmente em Alta Definição
    const canvasTexture = document.createElement('canvas');
    canvasTexture.width = 2048;
    canvasTexture.height = 1024;
    const ctx = canvasTexture.getContext('2d');
    if (ctx) {
      // Oceano Profundo
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
      oceanGrad.addColorStop(0, '#030b18');
      oceanGrad.addColorStop(0.5, '#051833');
      oceanGrad.addColorStop(1, '#020617');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, 2048, 1024);

      // Linhas de Grade Globais Sutis
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let y = 0; y <= 1024; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(2048, y);
        ctx.stroke();
      }
      for (let x = 0; x <= 2048; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1024);
        ctx.stroke();
      }

      // Desenho simplificado realista dos Continentes (América do Sul, Norte, Europa, África, Ásia)
      ctx.fillStyle = '#0f3a63';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;

      // América do Sul
      ctx.beginPath();
      ctx.moveTo(560, 520);
      ctx.bezierCurveTo(620, 530, 680, 580, 660, 680);
      ctx.bezierCurveTo(640, 780, 600, 880, 560, 920);
      ctx.bezierCurveTo(530, 880, 520, 720, 500, 600);
      ctx.closePath();
      ctx.fill();

      // América do Norte
      ctx.beginPath();
      ctx.moveTo(340, 200);
      ctx.bezierCurveTo(460, 180, 560, 240, 520, 380);
      ctx.bezierCurveTo(480, 460, 400, 480, 360, 440);
      ctx.bezierCurveTo(300, 380, 260, 260, 340, 200);
      ctx.closePath();
      ctx.fill();

      // Europa
      ctx.beginPath();
      ctx.moveTo(980, 240);
      ctx.bezierCurveTo(1060, 220, 1140, 260, 1120, 340);
      ctx.bezierCurveTo(1080, 380, 1000, 380, 960, 320);
      ctx.closePath();
      ctx.fill();

      // África
      ctx.beginPath();
      ctx.moveTo(960, 400);
      ctx.bezierCurveTo(1080, 400, 1140, 500, 1100, 650);
      ctx.bezierCurveTo(1060, 780, 1000, 820, 960, 750);
      ctx.bezierCurveTo(920, 650, 900, 500, 960, 400);
      ctx.closePath();
      ctx.fill();

      // Luzes Noturnas nas Cidades (Pontos Dourados)
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 4;
      for (let i = 0; i < 280; i++) {
        const px = Math.random() * 2048;
        const py = Math.random() * 1024;
        ctx.fillRect(px, py, 1.8, 1.8);
      }
    }

    const texture = new THREE.CanvasTexture(canvasTexture);

    // 4. Mesh da Terra
    const globeGeo = new THREE.SphereGeometry(1, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 35,
      specular: new THREE.Color(0x38bdf8),
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // 5. Atmosfera Brilhante
    const atmosphereGeo = new THREE.SphereGeometry(1.08, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
          gl_FragColor = vec4(0.22, 0.74, 0.97, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphere);

    // 6. Anel Orbital
    const ringGeo = new THREE.RingGeometry(1.35, 1.36, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.3;
    ring.rotation.y = 0.2;
    scene.add(ring);

    // 7. Marcadores 3D Reais (Brasil Sede)
    const markerGeo = new THREE.SphereGeometry(0.035, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const marker = new THREE.Mesh(markerGeo, markerMat);

    // Coordenadas aproximadas do Brasil na esfera (-15 lat, -50 long)
    const phi = (90 - (-14)) * (Math.PI / 180);
    const theta = (-51 + 180) * (Math.PI / 180);
    marker.position.x = -(1.02 * Math.sin(phi) * Math.cos(theta));
    marker.position.y = 1.02 * Math.cos(phi);
    marker.position.z = 1.02 * Math.sin(phi) * Math.sin(theta);
    globe.add(marker);

    // 8. Controles de Rotação por Mouse / Touch (Interativo!)
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let autoRotate = true;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      autoRotate = false;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;

      globe.rotation.y += deltaX * 0.006;
      globe.rotation.x += deltaY * 0.006;

      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
      setTimeout(() => { autoRotate = true; }, 3000); // Retoma rotação automática após soltar
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Suporte a Touch em Smartphones / Tablets
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        autoRotate = false;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;

      globe.rotation.y += deltaX * 0.008;
      globe.rotation.x += deltaY * 0.008;

      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    };

    const onTouchEnd = () => {
      isDragging = false;
      setTimeout(() => { autoRotate = true; }, 3000);
    };

    dom.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    // 9. Loop de Animação
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      if (autoRotate) {
        globe.rotation.y += 0.0025;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[540px] flex items-center justify-center select-none overflow-hidden group">
      {/* Container WebGL Three.js */}
      <div 
        ref={mountRef} 
        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing" 
      />

      {/* Dica de Interatividade Flutuante */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-cyan-500/20 text-[10px] text-cyan-300">
        🖱️ Arraste com o mouse para girar e explorar o globo
      </div>

      {/* Card Flutuante com Métricas Reais do Banco de Dados */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#0b1329]/95 backdrop-blur-md border border-cyan-500/30 rounded-2xl px-5 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.7)] flex items-center gap-4 z-10">
        <span className="text-2xl">🇧🇷</span>
        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold text-gray-300">
            Brasil • Centro Operacional
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white tracking-wide">
              {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            {totalCount > 0 && (
              <span className="text-[10px] font-bold text-emerald-400">
                {totalCount} {totalCount === 1 ? 'cliente ativo' : 'clientes ativos'}
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400">
            {totalCount === 0 ? 'Nenhuma transação externa confirmada no momento' : 'Sincronizado em tempo real com Asaas e Firestore'}
          </span>
        </div>
      </div>
    </div>
  );
}
