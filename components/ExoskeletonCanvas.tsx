import React, { useRef, useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';
import type { ExoskeletonCanvasProps, PoseLandmark } from '../types';

// Escala para ajustar el tamaño del modelo de MediaPipe a la escena
const POSE_SCALE = 2.5;

// Mapeo de índices de MediaPipe Pose a nombres de partes del cuerpo
const Landmark = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
};

const ExoskeletonCanvas: React.FC<ExoskeletonCanvasProps> = ({ rotationY, rotationX, zoom, landmarks }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Ref para almacenar todos los objetos y estado de Three.js de forma centralizada y segura.
  const sceneDataRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    model?: THREE.Group;
    lineSegments?: THREE.LineSegments;
    headMesh?: THREE.Mesh;
    animationFrameId?: number;
    handleResize?: () => void;
  }>({});

  const latestProps = useRef({ rotationY, rotationX, zoom });
  latestProps.current = { rotationY, rotationX, zoom };

  // Función para actualizar la geometría del esqueleto, ahora lee los objetos desde el ref central.
  const updateGeometry = (currentLandmarks: PoseLandmark[] | null) => {
    const { lineSegments, headMesh, model } = sceneDataRef.current;
    if (!lineSegments || !headMesh || !model) return;

    let points: { [key: string]: THREE.Vector3 };
    
    if (currentLandmarks && currentLandmarks.length > 0) {
      const toVec3 = (p: PoseLandmark) => new THREE.Vector3(p.x * POSE_SCALE, -p.y * POSE_SCALE, -p.z * POSE_SCALE);

      points = {
        head: toVec3(currentLandmarks[Landmark.NOSE]),
        neck: toVec3(currentLandmarks[Landmark.LEFT_SHOULDER]).clone().lerp(toVec3(currentLandmarks[Landmark.RIGHT_SHOULDER]), 0.5),
        shoulderL: toVec3(currentLandmarks[Landmark.LEFT_SHOULDER]),
        shoulderR: toVec3(currentLandmarks[Landmark.RIGHT_SHOULDER]),
        hipL: toVec3(currentLandmarks[Landmark.LEFT_HIP]),
        hipR: toVec3(currentLandmarks[Landmark.RIGHT_HIP]),
        hipCenter: toVec3(currentLandmarks[Landmark.LEFT_HIP]).clone().lerp(toVec3(currentLandmarks[Landmark.RIGHT_HIP]), 0.5),
        elbowL: toVec3(currentLandmarks[Landmark.LEFT_ELBOW]),
        elbowR: toVec3(currentLandmarks[Landmark.RIGHT_ELBOW]),
        wristL: toVec3(currentLandmarks[Landmark.LEFT_WRIST]),
        wristR: toVec3(currentLandmarks[Landmark.RIGHT_WRIST]),
        handL: toVec3(currentLandmarks[Landmark.LEFT_INDEX]),
        handR: toVec3(currentLandmarks[Landmark.RIGHT_INDEX]),
        thumbL: toVec3(currentLandmarks[Landmark.LEFT_THUMB]),
        thumbR: toVec3(currentLandmarks[Landmark.RIGHT_THUMB]),
        kneeL: toVec3(currentLandmarks[Landmark.LEFT_KNEE]),
        kneeR: toVec3(currentLandmarks[Landmark.RIGHT_KNEE]),
        ankleL: toVec3(currentLandmarks[Landmark.LEFT_ANKLE]),
        ankleR: toVec3(currentLandmarks[Landmark.RIGHT_ANKLE]),
        footL: toVec3(currentLandmarks[Landmark.LEFT_FOOT_INDEX]),
        footR: toVec3(currentLandmarks[Landmark.RIGHT_FOOT_INDEX]),
      };
      model.position.y = 0;
    } else {
      points = {
        head: new THREE.Vector3(0, 1.8, 0),
        neck: new THREE.Vector3(0, 1.6, 0),
        shoulderL: new THREE.Vector3(-0.4, 1.5, 0),
        shoulderR: new THREE.Vector3(0.4, 1.5, 0),
        hipL: new THREE.Vector3(-0.25, 0.9, 0),
        hipR: new THREE.Vector3(0.25, 0.9, 0),
        hipCenter: new THREE.Vector3(0, 0.9, 0),
        elbowL: new THREE.Vector3(-0.55, 1.1, 0.2),
        elbowR: new THREE.Vector3(0.55, 1.1, 0.2),
        wristL: new THREE.Vector3(-0.6, 0.7, 0.3),
        wristR: new THREE.Vector3(0.6, 0.7, 0.3),
        handL: new THREE.Vector3(-0.65, 0.6, 0.3),
        handR: new THREE.Vector3(0.65, 0.6, 0.3),
        thumbL: new THREE.Vector3(-0.55, 0.7, 0.4),
        thumbR: new THREE.Vector3(0.55, 0.7, 0.4),
        kneeL: new THREE.Vector3(-0.3, 0.4, 0),
        kneeR: new THREE.Vector3(0.3, 0.4, 0),
        ankleL: new THREE.Vector3(-0.3, 0, 0),
        ankleR: new THREE.Vector3(0.3, 0, 0),
        footL: new THREE.Vector3(-0.3, 0, 0.2),
        footR: new THREE.Vector3(0.3, 0, 0.2),
      };
      model.position.y = -0.9;
    }

    const connections = [
      points.head, points.neck, points.neck, points.shoulderL, points.neck, points.shoulderR,
      points.shoulderL, points.hipL, points.shoulderR, points.hipR, points.hipL, points.hipR,
      points.neck, points.hipCenter, points.shoulderL, points.elbowL, points.elbowL, points.wristL,
      points.shoulderR, points.elbowR, points.elbowR, points.wristR, points.hipL, points.kneeL,
      points.kneeL, points.ankleL, points.hipR, points.kneeR, points.kneeR, points.ankleR,
      points.wristL, points.handL, points.wristL, points.thumbL, points.wristR, points.handR,
      points.wristR, points.thumbR, points.ankleL, points.footL, points.ankleR, points.footR,
    ];

    lineSegments.geometry.setFromPoints(connections);
    headMesh.position.copy(points.head);
  }

  useEffect(() => {
    updateGeometry(landmarks);
  }, [landmarks]);

  useLayoutEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode || sceneDataRef.current.renderer) return;

    const { clientWidth, clientHeight } = mountNode;
    if (clientWidth === 0 || clientHeight === 0) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000);
    camera.position.z = 3;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(clientWidth, clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    const ambientLight = new THREE.AmbientLight(0x00ffff, 0.3);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    const model = new THREE.Group();
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    const headGeometry = new THREE.SphereGeometry(0.15, 16, 8);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    
    model.add(lineSegments);
    model.add(headMesh);
    scene.add(model);
    
    sceneDataRef.current = { renderer, scene, camera, model, lineSegments, headMesh };
    updateGeometry(null);
    mountNode.appendChild(renderer.domElement);

    const animate = () => {
      const data = sceneDataRef.current;
      // This guard is crucial. It checks the ref on every frame. If cleanup has started,
      // the ref will be empty, and the animation loop will stop, preventing errors.
      if (!data.model || !data.renderer) return;

      data.animationFrameId = requestAnimationFrame(animate);
      const { rotationY: targetY, rotationX: targetX, zoom: targetZoom } = latestProps.current;
      data.model.rotation.y = THREE.MathUtils.lerp(data.model.rotation.y, targetY, 0.1);
      data.model.rotation.x = THREE.MathUtils.lerp(data.model.rotation.x, targetX, 0.1);
      data.model.scale.setScalar(THREE.MathUtils.lerp(data.model.scale.x, targetZoom, 0.1));
      data.renderer.render(data.scene!, data.camera!);
    };
    animate();

    const handleResize = () => {
      const data = sceneDataRef.current;
      if (!mountRef.current || !data.renderer || !data.camera) return;
      const { clientWidth, clientHeight } = mountRef.current;
      if (clientWidth === 0 || clientHeight === 0) return;
      data.camera.aspect = clientWidth / clientHeight;
      data.camera.updateProjectionMatrix();
      data.renderer.setSize(clientWidth, clientHeight);
    };
    window.addEventListener('resize', handleResize);
    sceneDataRef.current.handleResize = handleResize;

    return () => {
      const data = sceneDataRef.current;
      
      // Immediately clear the ref. This acts as a flag for the animation loop to stop,
      // preventing it from accessing disposed resources.
      sceneDataRef.current = {};

      if (data.animationFrameId) {
        cancelAnimationFrame(data.animationFrameId);
      }
      if (data.handleResize) {
        window.removeEventListener('resize', data.handleResize);
      }
      if (data.lineSegments) {
        data.lineSegments.geometry.dispose();
        (data.lineSegments.material as THREE.Material).dispose();
      }
      if (data.headMesh) {
        data.headMesh.geometry.dispose();
        (data.headMesh.material as THREE.Material).dispose();
      }
      if (data.renderer) {
        data.renderer.dispose();
      }
    };
  }, []); 

  return <div ref={mountRef} className="absolute top-0 left-0 w-full h-full z-10" />;
};

export default ExoskeletonCanvas;
