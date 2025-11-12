import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { ExoskeletonCanvasProps } from '../types';

const ExoskeletonCanvas: React.FC<ExoskeletonCanvasProps> = ({ rotationY, rotationX, zoom }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Group>();
  
  // Una ref para mantener los últimos valores de las props, actualizada en cada render.
  // Esto permite al bucle de animación acceder a datos actualizados sin recrear el efecto principal.
  const latestProps = useRef({ rotationY, rotationX, zoom });
  latestProps.current = { rotationY, rotationX, zoom };

  useEffect(() => {
    if (!mountRef.current) return;

    // === Configuración de la Escena ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827); // Corresponde a bg-gray-900

    // === Configuración de la Cámara ===
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3;

    // === Configuración del Renderer ===
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    
    // === Iluminación ===
    const ambientLight = new THREE.AmbientLight(0x00ffff, 0.2); // Luz ambiental cian sutil
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6); // Luz blanca principal para dar profundidad
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // === Modelo del Exoesqueleto ===
    const modelGroup = new THREE.Group();
    modelRef.current = modelGroup;

    // Puntos clave del cuerpo (con brazos doblados y más detalle)
    const points = {
      // Cabeza y Torso
      head: new THREE.Vector3(0, 1.8, 0),
      neck: new THREE.Vector3(0, 1.6, 0),
      shoulderL: new THREE.Vector3(-0.4, 1.5, 0),
      shoulderR: new THREE.Vector3(0.4, 1.5, 0),
      hipL: new THREE.Vector3(-0.25, 0.9, 0),
      hipR: new THREE.Vector3(0.25, 0.9, 0),
      hipCenter: new THREE.Vector3(0, 0.9, 0),
      // Brazos (coordenada Z añadida para doblarlos)
      elbowL: new THREE.Vector3(-0.55, 1.1, 0.2),
      elbowR: new THREE.Vector3(0.55, 1.1, 0.2),
      wristL: new THREE.Vector3(-0.6, 0.7, 0.3),
      wristR: new THREE.Vector3(0.6, 0.7, 0.3),
      // Manos
      handL: new THREE.Vector3(-0.65, 0.6, 0.3),
      handR: new THREE.Vector3(0.65, 0.6, 0.3),
      thumbL: new THREE.Vector3(-0.55, 0.7, 0.4),
      thumbR: new THREE.Vector3(0.55, 0.7, 0.4),
      // Piernas
      kneeL: new THREE.Vector3(-0.3, 0.4, 0),
      kneeR: new THREE.Vector3(0.3, 0.4, 0),
      ankleL: new THREE.Vector3(-0.3, 0, 0),
      ankleR: new THREE.Vector3(0.3, 0, 0),
      // Pies
      footL: new THREE.Vector3(-0.3, 0, 0.2),
      footR: new THREE.Vector3(0.3, 0, 0.2),
    };

    // Conexiones entre puntos para formar las líneas
    const connections = [
      // Torso
      points.neck, points.shoulderL,
      points.neck, points.shoulderR,
      points.shoulderL, points.hipL,
      points.shoulderR, points.hipR,
      points.hipL, points.hipR,
      points.neck, points.hipCenter,
      // Brazo izquierdo
      points.shoulderL, points.elbowL,
      points.elbowL, points.wristL,
      // Brazo derecho
      points.shoulderR, points.elbowR,
      points.elbowR, points.wristR,
      // Pierna izquierda
      points.hipL, points.kneeL,
      points.kneeL, points.ankleL,
      // Pierna derecha
      points.hipR, points.kneeR,
      points.kneeR, points.ankleR,
      // Manos (forma de V)
      points.wristL, points.handL,
      points.wristL, points.thumbL,
      points.wristR, points.handR,
      points.wristR, points.thumbR,
      // Pies
      points.ankleL, points.footL,
      points.ankleR, points.footR,
    ];

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(connections);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff, // Cian brillante
      linewidth: 2,
    });
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    
    // Cabeza (Círculo)
    const headGeometry = new THREE.CircleGeometry(0.15, 32); // radio, segmentos
    const edgesGeometry = new THREE.EdgesGeometry(headGeometry);
    const headMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const headMesh = new THREE.LineSegments(edgesGeometry, headMaterial);
    headMesh.position.copy(points.head);
    
    modelGroup.add(lineSegments);
    modelGroup.add(headMesh);
    
    // Centrar el modelo verticalmente
    modelGroup.position.y = -0.9;
    
    scene.add(modelGroup);

    // === Bucle de Animación ===
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (modelRef.current) {
        // Obtener los valores objetivo desde nuestra ref
        const { rotationY: targetY, rotationX: targetX, zoom: targetZoom } = latestProps.current;

        // Interpolar suavemente (lerp) las transformaciones actuales del modelo hacia los valores objetivo.
        // El factor 0.1 determina la "suavidad" - un valor menor es más lento/suave.
        modelRef.current.rotation.y = THREE.MathUtils.lerp(modelRef.current.rotation.y, targetY, 0.1);
        modelRef.current.rotation.x = THREE.MathUtils.lerp(modelRef.current.rotation.x, targetX, 0.1);
        
        modelRef.current.scale.x = THREE.MathUtils.lerp(modelRef.current.scale.x, targetZoom, 0.1);
        modelRef.current.scale.y = THREE.MathUtils.lerp(modelRef.current.scale.y, targetZoom, 0.1);
        modelRef.current.scale.z = THREE.MathUtils.lerp(modelRef.current.scale.z, targetZoom, 0.1);
      }

      renderer.render(scene, camera);
    };
    animate();

    // === Manejo de Redimensión ===
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // === Limpieza ===
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      lineGeometry.dispose();
      lineMaterial.dispose();
      headGeometry.dispose();
      edgesGeometry.dispose();
      headMaterial.dispose();
      renderer.dispose();
    };
  }, []); // El array de dependencias vacío asegura que esto se ejecute solo una vez

  return <div ref={mountRef} className="absolute top-0 left-0 w-full h-full" />;
};

export default ExoskeletonCanvas;