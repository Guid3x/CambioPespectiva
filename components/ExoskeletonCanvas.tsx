import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import type { PoseLandmark, ExoskeletonCanvasRef } from '../types';

const POSE_SCALE = 2.5;

const LandmarkMap = {
  NOSE: 0, LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12, LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16, LEFT_HIP: 23, RIGHT_HIP: 24, LEFT_KNEE: 25,
  RIGHT_KNEE: 26, LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
};

// --- Colores para las distintas partes del cuerpo ---
const BODY_COLORS = {
  torso: new THREE.Color(0xffffff),   // Blanco
  armL: new THREE.Color(0xff8800),    // Naranja
  armR: new THREE.Color(0x00ffff),    // Cian
  legL: new THREE.Color(0xff00ff),    // Magenta
  legR: new THREE.Color(0xffff00),    // Amarillo
  head: new THREE.Color(0x00ffff),    // Cian (para la cabeza)
};

const ExoskeletonCanvas = forwardRef<ExoskeletonCanvasRef>((_props, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const threeState = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    model?: THREE.Group;
    lineParts?: { [key: string]: THREE.LineSegments };
    headMesh?: THREE.Mesh;
    animationFrameId?: number;
    currentPoints?: { [key: string]: THREE.Vector3 };
    targetPoints?: { [key: string]: THREE.Vector3 };
  }>({});
  const controlsRef = useRef({ rotationY: 0, rotationX: 0, zoom: 1 });

  useImperativeHandle(ref, () => ({
    updateControls: (controls) => {
      controlsRef.current = controls;
    },
    updatePose: (landmarks) => {
      if (!threeState.current.targetPoints) return;

      let newPoints: { [key: string]: THREE.Vector3 };
      if (landmarks && landmarks.length > 0) {
        const toVec3 = (p: PoseLandmark) => new THREE.Vector3(p.x * POSE_SCALE, -p.y * POSE_SCALE, -p.z * POSE_SCALE);
        newPoints = {
          head: toVec3(landmarks[LandmarkMap.NOSE]),
          neck: toVec3(landmarks[LandmarkMap.LEFT_SHOULDER]).clone().lerp(toVec3(landmarks[LandmarkMap.RIGHT_SHOULDER]), 0.5),
          shoulderL: toVec3(landmarks[LandmarkMap.LEFT_SHOULDER]), shoulderR: toVec3(landmarks[LandmarkMap.RIGHT_SHOULDER]),
          hipL: toVec3(landmarks[LandmarkMap.LEFT_HIP]), hipR: toVec3(landmarks[LandmarkMap.RIGHT_HIP]),
          hipCenter: toVec3(landmarks[LandmarkMap.LEFT_HIP]).clone().lerp(toVec3(landmarks[LandmarkMap.RIGHT_HIP]), 0.5),
          elbowL: toVec3(landmarks[LandmarkMap.LEFT_ELBOW]), elbowR: toVec3(landmarks[LandmarkMap.RIGHT_ELBOW]),
          wristL: toVec3(landmarks[LandmarkMap.LEFT_WRIST]), wristR: toVec3(landmarks[LandmarkMap.RIGHT_WRIST]),
          kneeL: toVec3(landmarks[LandmarkMap.LEFT_KNEE]), kneeR: toVec3(landmarks[LandmarkMap.RIGHT_KNEE]),
          ankleL: toVec3(landmarks[LandmarkMap.LEFT_ANKLE]), ankleR: toVec3(landmarks[LandmarkMap.RIGHT_ANKLE]),
        };
      } else {
        newPoints = createDefaultPose();
      }
      threeState.current.targetPoints = newPoints;
    },
    captureCanvas: () => {
      const { renderer, scene, camera } = threeState.current;
      if (!renderer || !scene || !camera) return null;
      
      const originalClearColor = new THREE.Color();
      renderer.getClearColor(originalClearColor);
      const originalClearAlpha = renderer.getClearAlpha();

      // Forzar fondo opaco para la captura
      renderer.setClearColor(0x000000, 1);
      renderer.render(scene, camera);
      const dataURL = renderer.domElement.toDataURL('image/png');
      
      // Restaurar transparencia
      renderer.setClearColor(originalClearColor, originalClearAlpha);
      
      return dataURL;
    }
  }));

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    const { clientWidth, clientHeight } = mountNode;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000);
    camera.position.z = 3;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(clientWidth, clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    const model = new THREE.Group();
    
    const lineParts: { [key: string]: THREE.LineSegments } = {};
    const materials = {
      torso: new THREE.LineBasicMaterial({ color: BODY_COLORS.torso }),
      armL: new THREE.LineBasicMaterial({ color: BODY_COLORS.armL }),
      armR: new THREE.LineBasicMaterial({ color: BODY_COLORS.armR }),
      legL: new THREE.LineBasicMaterial({ color: BODY_COLORS.legL }),
      legR: new THREE.LineBasicMaterial({ color: BODY_COLORS.legR }),
    };

    for (const part in materials) {
        const geometry = new THREE.BufferGeometry();
        const line = new THREE.LineSegments(geometry, (materials as any)[part]);
        model.add(line);
        lineParts[part] = line;
    }
    
    const headGeometry = new THREE.SphereGeometry(0.15, 16, 8);
    const headMaterial = new THREE.MeshBasicMaterial({ color: BODY_COLORS.head, wireframe: true });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    model.add(headMesh);
    scene.add(model);
    
    threeState.current = { 
      renderer, scene, camera, model, lineParts, headMesh,
      currentPoints: createDefaultPose(),
      targetPoints: createDefaultPose(),
    };

    const animate = () => {
      threeState.current.animationFrameId = requestAnimationFrame(animate);
      const { model: currentModel, renderer: currentRenderer, scene: currentScene, camera: currentCamera, currentPoints, targetPoints, lineParts, headMesh } = threeState.current;
      if (!currentModel || !currentRenderer || !currentScene || !currentCamera || !currentPoints || !targetPoints || !lineParts || !headMesh) return;

      const { rotationY: targetY, rotationX: targetX, zoom: targetZoom } = controlsRef.current;
      currentModel.rotation.y = THREE.MathUtils.lerp(currentModel.rotation.y, targetY, 0.1);
      currentModel.rotation.x = THREE.MathUtils.lerp(currentModel.rotation.x, targetX, 0.1);
      currentModel.scale.setScalar(THREE.MathUtils.lerp(currentModel.scale.x, targetZoom, 0.1));
      
      let poseNeedsUpdate = false;
      for (const key in targetPoints) {
        const current = currentPoints[key];
        const target = targetPoints[key];
        if (current && target && !current.equals(target)) {
          current.lerp(target, 0.08);
          poseNeedsUpdate = true;
        }
      }

      if (poseNeedsUpdate) {
        const connections: { [key: string]: THREE.Vector3[] } = {
          torso: [currentPoints.head, currentPoints.neck, currentPoints.neck, currentPoints.hipCenter],
          armL: [currentPoints.neck, currentPoints.shoulderL, currentPoints.shoulderL, currentPoints.elbowL, currentPoints.elbowL, currentPoints.wristL],
          armR: [currentPoints.neck, currentPoints.shoulderR, currentPoints.shoulderR, currentPoints.elbowR, currentPoints.elbowR, currentPoints.wristR],
          legL: [currentPoints.hipCenter, currentPoints.hipL, currentPoints.hipL, currentPoints.kneeL, currentPoints.kneeL, currentPoints.ankleL],
          legR: [currentPoints.hipCenter, currentPoints.hipR, currentPoints.hipR, currentPoints.kneeR, currentPoints.kneeR, currentPoints.ankleR],
        };

        for (const part in connections) {
          if (lineParts[part]) {
            lineParts[part].geometry.setFromPoints(connections[part]);
          }
        }
        headMesh.position.copy(currentPoints.head);
      }
      
      currentRenderer.render(currentScene, currentCamera);
    };

    mountNode.appendChild(renderer.domElement);
    
    const handleResize = () => {
      if (!mountNode || !threeState.current.renderer || !threeState.current.camera) return;
      const { clientWidth, clientHeight } = mountNode;
      if (clientWidth > 0 && clientHeight > 0) {
        threeState.current.camera.aspect = clientWidth / clientHeight;
        threeState.current.camera.updateProjectionMatrix();
        threeState.current.renderer.setSize(clientWidth, clientHeight);
      }
    };
    
    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      if (threeState.current.animationFrameId) {
        cancelAnimationFrame(threeState.current.animationFrameId);
      }
      window.removeEventListener('resize', handleResize);

      const { scene, renderer } = threeState.current;

      if (scene) {
        scene.traverse((object) => {
          const obj = object as any;
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((material: THREE.Material) => material.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
        scene.clear();
      }
      
      renderer?.dispose();

      if (mountNode && renderer?.domElement && mountNode.contains(renderer.domElement)) {
        mountNode.removeChild(renderer.domElement);
      }
      
      threeState.current = {};
    };
  }, []);

  return <div ref={mountRef} className="absolute top-0 left-0 w-full h-full" />;
});

// Helper to create THREE.Vector3 from plain objects for deep copying
function createVector3(p: { x: number, y: number, z: number }) {
  return new THREE.Vector3(p.x, p.y, p.z);
}

function createDefaultPose() {
  const points = {
    head: { x: 0, y: 0.8, z: 0 }, neck: { x: 0, y: 0.6, z: 0 },
    shoulderL: { x: -0.4, y: 0.6, z: 0 }, shoulderR: { x: 0.4, y: 0.6, z: 0 },
    hipL: { x: -0.25, y: -0.1, z: 0 }, hipR: { x: 0.25, y: -0.1, z: 0 },
    hipCenter: { x: 0, y: -0.1, z: 0 }, elbowL: { x: -0.8, y: 0.2, z: 0 },
    elbowR: { x: 0.8, y: 0.2, z: 0 }, wristL: { x: -1.2, y: -0.2, z: 0 },
    wristR: { x: 1.2, y: -0.2, z: 0 }, kneeL: { x: -0.25, y: -0.6, z: 0 },
    kneeR: { x: 0.25, y: -0.6, z: 0 }, ankleL: { x: -0.25, y: -1.1, z: 0 },
    ankleR: { x: 0.25, y: -1.1, z: 0 },
  };

  const vectorPoints: { [key: string]: THREE.Vector3 } = {};
  for(const key in points) {
      vectorPoints[key] = createVector3((points as any)[key]);
  }
  return vectorPoints;
}

export default ExoskeletonCanvas;