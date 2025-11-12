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
  onGenerate: () => void;
  isGenerating: boolean;
  hasImage: boolean;
  isPoseReady: boolean;
}

export interface ExoskeletonCanvasProps {
  rotationY: number;
  rotationX: number;
  zoom: number;
  landmarks: PoseLandmark[] | null;
}