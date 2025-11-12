import type { ChangeEvent } from 'react';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface ControlPanelProps {
  rotationY: number;
  setRotationY: (value: number) => void;
  rotationX: number;
  setRotationX: (value: number) => void;
  zoom: number;
  setZoom: (value: number) => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  hasImage: boolean;
  isPoseReady: boolean;
  onCapture: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  capturedImageUrl: string | null;
}

// Interfaz para el ref del Canvas, exponiendo los métodos que el padre puede llamar
export interface ExoskeletonCanvasRef {
  updatePose: (landmarks: PoseLandmark[] | null) => void;
  updateControls: (controls: { rotationY: number, rotationX: number, zoom: number }) => void;
  captureCanvas: () => string | null;
}