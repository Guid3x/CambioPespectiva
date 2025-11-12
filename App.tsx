import React, { useState, useRef, useEffect } from 'react';
import ExoskeletonCanvas from './components/ExoskeletonCanvas';
import ControlPanel from './components/ControlPanel';
import type { PoseLandmark } from './types';
import { GoogleGenAI, Modality } from '@google/genai';

// Declaración para que TypeScript reconozca la clase Pose de MediaPipe en el objeto window
declare const Pose: any;

const App: React.FC = () => {
  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [landmarks, setLandmarks] = useState<PoseLandmark[] | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [poseError, setPoseError] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isPoseReady, setIsPoseReady] = useState(false);


  const poseRef = useRef<any>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());

  // Inicializa el detector de poses de MediaPipe de forma segura, esperando a que el script cargue
  useEffect(() => {
    let isMounted = true;
    let timeoutId: number | undefined;

    const initializePose = () => {
      // Comprueba si la clase Pose está disponible en el objeto window
      if (typeof Pose === 'undefined') {
        // Si no está, vuelve a intentarlo en 100ms
        timeoutId = window.setTimeout(initializePose, 100);
        return;
      }

      try {
        const pose = new Pose({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          },
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults((results: any) => {
          // Salvaguarda crítica: no intentar actualizar el estado si el componente se ha desmontado.
          if (!isMounted) return;

          try {
            // Validación estricta: nos aseguramos de recibir los 33 landmarks para evitar errores.
            if (results && results.poseWorldLandmarks && results.poseWorldLandmarks.length === 33) {
              setLandmarks(results.poseWorldLandmarks);
              setPoseError(null);
            } else {
              setPoseError("No se pudo detectar una pose completa en la imagen. Intenta con otra.");
            }
          } catch (e) {
            console.error("Error processing MediaPipe results:", e);
            setPoseError("Hubo un error al procesar los datos de la pose.");
          }
        });

        poseRef.current = pose;
        
        // Indica que el detector de poses está listo para usarse
        setIsPoseReady(true);
      } catch (error) {
        console.error("Failed to initialize MediaPipe Pose detector:", error);
        if (isMounted) {
          setPoseError("No se pudo cargar el modelo de IA. Revisa tu conexión o recarga la página.");
        }
      }
    };

    initializePose();

    return () => {
      isMounted = false;
      // Limpia el temporizador si el componente se desmonta antes de que se complete la inicialización
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Cierra la instancia de MediaPipe para liberar recursos (WASM, etc.)
      poseRef.current?.close();
    }
  }, []);

  // Efecto para procesar la imagen cuando `imageUrl` cambia, manejando el ciclo de vida de forma segura.
  useEffect(() => {
    if (!imageUrl || !poseRef.current) {
      return;
    }

    const img = imageRef.current;
    
    const handleImageLoad = () => {
      if (poseRef.current) {
        poseRef.current.send({ image: img });
      }
    };

    img.addEventListener('load', handleImageLoad);
    img.src = imageUrl;

    // Función de limpieza: se ejecuta cuando el componente se desmonta o `imageUrl` cambia.
    return () => {
      img.removeEventListener('load', handleImageLoad);
    };
  }, [imageUrl]);


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setGeneratedImageUrl(null);
    setGenerationError(null);
    setPoseError(null);
    setLandmarks(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      // Actualiza el estado, lo que disparará el useEffect para procesar la imagen.
      setImageUrl(url);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateImage = async () => {
    if (!imageUrl) {
        setGenerationError("Por favor, carga una imagen primero.");
        return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedImageUrl(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        const base64Data = imageUrl.split(',')[1];
        const mimeType = imageUrl.split(';')[0].split(':')[1];

        const imagePart = {
            inlineData: { data: base64Data, mimeType },
        };

        const textPart = {
            text: "A partir de la imagen proporcionada, redibuja a la persona para que parezca una figura minimalista hecha de brillantes líneas de neón cian, como un exoesqueleto de alambre. Mantén la estructura facial, la pose y la forma del cuerpo originales, pero rénderizalas en este estilo de arte lineal de neón. El fondo debe ser oscuro y minimalista para resaltar el efecto de neón."
        };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart && firstPart.inlineData) {
            const generatedBase64 = firstPart.inlineData.data;
            const generatedUrl = `data:image/png;base64,${generatedBase64}`;
            setGeneratedImageUrl(generatedUrl);
        } else {
            throw new Error("La respuesta de la API no contenía una imagen.");
        }

    } catch (e) {
        console.error(e);
        setGenerationError("Ocurrió un error al generar la imagen. Inténtalo de nuevo.");
    } finally {
        setIsGenerating(false);
    }
  };

  const resetGeneratedImage = () => {
    setGeneratedImageUrl(null);
    setGenerationError(null);
  }

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden bg-gray-900 text-white transition-all duration-500"
      style={{
        backgroundImage: !generatedImageUrl && imageUrl ? `url(${imageUrl})` : 'none',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {isGenerating && (
        <div className="absolute inset-0 bg-black bg-opacity-80 z-50 flex flex-col justify-center items-center backdrop-blur-sm">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400"></div>
          <p className="text-cyan-300 text-lg mt-4 font-mono">Generando imagen...</p>
        </div>
      )}

      {generatedImageUrl ? (
        <div className="w-full h-full flex flex-col justify-center items-center z-30 p-4">
          <img src={generatedImageUrl} className="max-w-full max-h-full object-contain" alt="Generated Neon Pose" />
          <button 
            onClick={resetGeneratedImage} 
            className="absolute bottom-8 px-6 py-3 bg-cyan-500 text-gray-900 font-mono rounded-md cursor-pointer hover:bg-cyan-400 transition-colors z-40"
          >
            Volver al Visor 3D
          </button>
        </div>
      ) : (
        <>
          {/* Superposición oscura para mejorar la legibilidad del exoesqueleto sobre la imagen */}
          {imageUrl && <div className="absolute inset-0 bg-black bg-opacity-50 z-0"></div>}

          <div className="absolute top-0 left-0 w-full text-center p-4 z-10 pointer-events-none">
            <h1 className="text-2xl md:text-4xl font-thin tracking-widest uppercase text-cyan-400">Visor de Exoesqueleto</h1>
            {poseError && <p className="text-red-400 mt-2">{poseError}</p>}
            {generationError && <p className="text-red-400 mt-2">{generationError}</p>}
          </div>
          
          <ExoskeletonCanvas rotationY={rotationY} rotationX={rotationX} zoom={zoom} landmarks={landmarks} />
          
          <ControlPanel 
            rotationY={rotationY}
            setRotationY={setRotationY}
            rotationX={rotationX}
            setRotationX={setRotationX}
            zoom={zoom}
            setZoom={setZoom}
            onImageUpload={handleImageUpload}
            onGenerate={handleGenerateImage}
            isGenerating={isGenerating}
            hasImage={!!imageUrl}
            isPoseReady={isPoseReady}
          />
        </>
      )}
    </div>
  );
};

export default App;