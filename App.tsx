
import React, { useState } from 'react';
import ExoskeletonCanvas from './components/ExoskeletonCanvas';
import ControlPanel from './components/ControlPanel';

const App: React.FC = () => {
  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(0);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-900 text-white">
      <div className="absolute top-0 left-0 w-full text-center p-4 z-10 pointer-events-none">
        <h1 className="text-2xl md:text-4xl font-thin tracking-widest uppercase text-cyan-400">Visor de Exoesqueleto</h1>
      </div>
      
      <ExoskeletonCanvas rotationY={rotationY} rotationX={rotationX} zoom={zoom} />
      
      <ControlPanel 
        rotationY={rotationY}
        setRotationY={setRotationY}
        rotationX={rotationX}
        setRotationX={setRotationX}
        zoom={zoom}
        setZoom={setZoom}
      />
    </div>
  );
};

export default App;