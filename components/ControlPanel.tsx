import React from 'react';
import type { ControlPanelProps } from '../types';

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, value, min, max, step, onChange }) => (
  <div className="flex flex-col items-center w-full max-w-xs md:max-w-sm">
    <label className="mb-2 text-sm font-mono text-cyan-300 tracking-wider">
      {label}
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
    />
  </div>
);


const ControlPanel: React.FC<ControlPanelProps> = ({
  rotationY,
  setRotationY,
  rotationX,
  setRotationX,
  zoom,
  setZoom,
  onImageUpload,
  onGenerate,
  isGenerating,
  hasImage,
  isPoseReady,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-black bg-opacity-40 backdrop-blur-sm z-20">
      <div className="container mx-auto flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8">
        <Slider
          label="Rotar"
          value={rotationY}
          min={-Math.PI}
          max={Math.PI}
          step={0.01}
          onChange={(e) => setRotationY(parseFloat(e.target.value))}
        />
        <Slider
          label="Inclinar"
          value={rotationX}
          min={-Math.PI / 2}
          max={Math.PI / 2}
          step={0.01}
          onChange={(e) => setRotationX(parseFloat(e.target.value))}
        />
        <Slider
          label="Zoom"
          value={zoom}
          min={0.5}
          max={2.5}
          step={0.01}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
        />
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
                <label 
                    htmlFor="file-upload" 
                    className={`px-4 py-2 font-mono rounded-md transition-colors ${
                        isPoseReady 
                        ? 'bg-cyan-500 text-gray-900 cursor-pointer hover:bg-cyan-400' 
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    {isPoseReady ? 'Cargar Imagen' : 'Cargando IA...'}
                </label>
                <input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    onChange={onImageUpload} 
                    accept="image/*"
                    disabled={!isPoseReady}
                />
            </div>
            <div className="flex flex-col items-center">
                <button 
                    onClick={onGenerate} 
                    disabled={isGenerating || !hasImage || !isPoseReady}
                    className="px-4 py-2 bg-green-500 text-gray-900 font-mono rounded-md cursor-pointer hover:bg-green-400 transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    {isGenerating ? 'Generando...' : 'Crear Imagen Neón'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;