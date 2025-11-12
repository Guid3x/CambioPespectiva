
export interface ControlPanelProps {
  rotationY: number;
  setRotationY: (value: number) => void;
  rotationX: number;
  setRotationX: (value: number) => void;
  zoom: number;
  setZoom: (value: number) => void;
}

export interface ExoskeletonCanvasProps {
  rotationY: number;
  rotationX: number;
  zoom: number;
}
