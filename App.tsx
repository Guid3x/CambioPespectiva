import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import ExoskeletonCanvas from './components/ExoskeletonCanvas';
import ControlPanel from './components/ControlPanel';
import { usePoseDetector } from './hooks/usePoseDetector';
import type { ExoskeletonCanvasRef, PoseLandmark } from './types';

const App: React.FC = () => {
  // Estado para los controles del visor 3D
  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(0);
  const [zoom, setZoom] = useState(1);

  // Estado para el flujo de imágenes y poses
  const [landmarks, setLandmarks] = useState<PoseLandmark[] | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Nuevo estado para análisis
  const [generationError, setGenerationError] = useState<string | null>(null);


  // Hook personalizado para manejar toda la lógica de MediaPipe
  const { isPoseReady, poseError, processImage } = usePoseDetector({
    onResults: (newLandmarks) => {
      setLandmarks(newLandmarks);
      setIsProcessing(false); // Desactivar al recibir resultados
    },
    onError: (message) => {
       setIsProcessing(false); // Desactivar en caso de error
       // Silenciado para no duplicar errores en la UI
    }
  });
  
  // Ref para controlar el componente del lienzo de forma imperativa
  const canvasRef = useRef<ExoskeletonCanvasRef>(null);

  useEffect(() => {
    canvasRef.current?.updateControls({ rotationY, rotationX, zoom });
  }, [rotationY, rotationX, zoom]);

  useEffect(() => {
    canvasRef.current?.updatePose(landmarks);
  }, [landmarks]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reiniciar todos los estados de imagen y activar procesamiento
    setIsProcessing(true);
    setLandmarks(null);
    setCapturedImageUrl(null);
    setGeneratedImageUrl(null);
    setGenerationError(null);


    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImageUrl(url);

      const img = new Image();
      img.onload = () => processImage(img);
      img.onerror = () => {
        setIsProcessing(false);
        setGenerationError("No se pudo cargar el archivo de imagen.");
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = () => {
    const dataURL = canvasRef.current?.captureCanvas();
    if (dataURL) {
      setCapturedImageUrl(dataURL);
      setGeneratedImageUrl(null); // Limpiar resultado anterior si se captura una nueva pose
    }
  };

  const handleGenerate = async () => {
    if (!imageUrl || !capturedImageUrl) return;

    setIsGenerating(true);
    setGeneratedImageUrl(null);
    setGenerationError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const originalImagePart = {
        inlineData: {
          mimeType: imageUrl.split(';')[0].split(':')[1],
          data: imageUrl.split(',')[1],
        },
      };

      const poseImagePart = {
        inlineData: {
          mimeType: capturedImageUrl.split(';')[0].split(':')[1],
          data: capturedImageUrl.split(',')[1],
        },
      };

      const textPart = {
        text: "Toma a la persona de la primera imagen. Ignora por completo el estilo visual (líneas de neón, fondo negro) de la segunda imagen. Usa la segunda imagen ÚNICAMENTE como una referencia esquelética precisa para la pose. Recrea a la persona de la primera imagen adoptando la pose exacta del esqueleto en la segunda imagen. El resultado debe ser una foto realista con un fondo de estudio neutro y liso.",
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', // Modelo multimodal adecuado
        contents: { parts: [originalImagePart, poseImagePart, textPart] },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const newImageDataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          setGeneratedImageUrl(newImageDataUrl);
          break; 
        }
      }

    } catch (error) {
      console.error("Error generating image:", error);
      setGenerationError("Error al generar la imagen. Inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const ImagePanel: React.FC<{ title: string; src?: string | null; children?: React.ReactNode; isLoading?: boolean; error?: string | null }> = ({ title, src, children, isLoading, error }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-2 md:p-4 bg-gray-800 bg-opacity-50 rounded-lg shadow-lg min-h-[300px] md:min-h-0">
      <h2 className="text-lg font-thin tracking-wider text-cyan-300 mb-2">{title}</h2>
      <div className="relative w-full flex-grow bg-gray-900 rounded-md overflow-hidden flex items-center justify-center">
        {isLoading ? (
          <div className="text-cyan-400">Generando...</div>
        ) : error ? (
           <div className="p-4 text-center text-red-400">{error}</div>
        ) : src ? (
          <img src={src} alt={title} className="w-full h-full object-contain" />
        ) : children ? (
          children
        ) : (
          <div className="text-gray-500 text-sm">Contenido no disponible</div>
        )}
      </div>
    </div>
  );


  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-900 text-white flex flex-col">
       <div className="w-full text-center p-4 z-10 pointer-events-none">
          <h1 className="text-2xl md:text-4xl font-thin tracking-widest uppercase text-cyan-400">Visor de Exoesqueleto</h1>
          {poseError && <p className="text-red-400 mt-2">{poseError}</p>}
        </div>
      
      <main className="grid flex-grow grid-cols-1 md:grid-cols-3 p-4 gap-4 overflow-hidden">
        {/* Columna Izquierda: Visor Interactivo Superpuesto */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 md:p-4 bg-gray-800 bg-opacity-50 rounded-lg shadow-lg min-h-[300px] md:min-h-0">
          <h2 className="text-lg font-thin tracking-wider text-cyan-300 mb-2">Visor Interactivo</h2>
          <div className="relative w-full flex-grow bg-gray-900 rounded-md overflow-hidden">
            {imageUrl && (
              <img src={imageUrl} alt="Imagen Original" className="absolute top-0 left-0 w-full h-full object-contain" />
            )}
            <ExoskeletonCanvas ref={canvasRef} />
             {isProcessing && (
              <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-70 flex flex-col items-center justify-center z-10">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400"></div>
                  <p className="mt-4 text-cyan-300">Analizando pose...</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Columna Central: Captura */}
        <ImagePanel title="Captura del Exoesqueleto" src={capturedImageUrl} />

        {/* Columna Derecha: Resultado */}
        <ImagePanel 
            title="Resultado IA"
            src={generatedImageUrl}
            isLoading={isGenerating}
            error={generationError}
        />

      </main>
        
      <ControlPanel 
        rotationY={rotationY} setRotationY={setRotationY}
        rotationX={rotationX} setRotationX={setRotationX}
        zoom={zoom} setZoom={setZoom}
        onImageUpload={handleImageUpload}
        hasImage={!!imageUrl}
        isPoseReady={isPoseReady}
        // FIX: The onCapture prop was passed an undefined variable. It should be passed the handleCapture function.
        onCapture={handleCapture}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        capturedImageUrl={capturedImageUrl}
      />
    </div>
  );
};

export default App;