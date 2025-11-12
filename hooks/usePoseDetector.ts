import { useState, useRef, useEffect } from 'react';
import type { PoseLandmark } from '../types';

// Declaración para que TypeScript reconozca la clase Pose de MediaPipe en el objeto window
declare const Pose: any;

// --- Patrón Singleton para la instancia de MediaPipe Pose ---
// Esto asegura que el modelo de IA se inicialice UNA SOLA VEZ durante la vida de la aplicación,
// evitando conflictos con el ciclo de vida de React (especialmente en Modo Estricto).
let poseInstance: any = null;
let posePromise: Promise<any> | null = null;

const initializePoseSingleton = (): Promise<any> => {
  // Si ya tenemos la instancia o una promesa para obtenerla, la retornamos.
  if (poseInstance) return Promise.resolve(poseInstance);
  if (posePromise) return posePromise;

  // Creamos una nueva promesa que se encargará de la inicialización.
  posePromise = new Promise((resolve, reject) => {
    const attemptInitialization = () => {
      if (typeof Pose !== 'undefined') {
        try {
          const pose = new Pose({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
          });

          pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          
          poseInstance = pose;
          resolve(poseInstance);
        } catch (error) {
          console.error("Failed to initialize MediaPipe Pose detector:", error);
          reject(new Error("No se pudo cargar el modelo de IA."));
        }
      } else {
        // Si el script de MediaPipe aún no se ha cargado, reintentamos en 100ms.
        setTimeout(attemptInitialization, 100);
      }
    };
    attemptInitialization();
  });
  return posePromise;
};
// --- Fin del Patrón Singleton ---

interface UsePoseDetectorProps {
  onResults: (landmarks: PoseLandmark[] | null) => void;
  onError: (message: string) => void;
}

export const usePoseDetector = ({ onResults, onError }: UsePoseDetectorProps) => {
  const [isPoseReady, setIsPoseReady] = useState(false);
  const [poseError, setPoseError] = useState<string | null>(null);
  const poseRef = useRef<any>(null);

  // Almacenar los callbacks en un ref para que siempre estén actualizados sin disparar el efecto.
  const callbacksRef = useRef({ onResults, onError });
  useEffect(() => {
    callbacksRef.current.onResults = onResults;
    callbacksRef.current.onError = onError;
  });

  // Efecto para conectar este hook a la instancia singleton de Pose.
  // Se cambia a useEffect para que la inicialización (que puede ser lenta) no bloquee el pintado del navegador.
  useEffect(() => {
    let isMounted = true;

    const setupPose = async () => {
      try {
        const pose = await initializePoseSingleton();
        if (!isMounted) return;

        // Asignamos el manejador de resultados específico de esta instancia del hook.
        pose.onResults((results: any) => {
          if (!isMounted) return;

          if (results?.poseWorldLandmarks && results.poseWorldLandmarks.length === 33) {
            callbacksRef.current.onResults(results.poseWorldLandmarks);
            setPoseError(null);
          } else {
            callbacksRef.current.onResults(null);
            const msg = "No se detectó una pose completa. Intenta con otra imagen.";
            setPoseError(msg);
            callbacksRef.current.onError(msg);
          }
        });

        poseRef.current = pose;
        setIsPoseReady(true);

      } catch (error) {
        if (isMounted) {
          const msg = error instanceof Error ? error.message : "Error desconocido al cargar IA.";
          setPoseError(msg + " Revisa tu conexión.");
          callbacksRef.current.onError(msg + " Revisa tu conexión.");
        }
      }
    };

    setupPose();

    // La función de limpieza es ahora mucho más segura.
    return () => {
      isMounted = false;
      // CRÍTICO: NO llamamos a pose.close() porque la instancia es un singleton.
      // En su lugar, simplemente desvinculamos el listener de resultados de este componente
      // para evitar actualizaciones de estado en un componente desmontado.
      if (poseRef.current) {
        poseRef.current.onResults(null);
      }
    };
  }, []); // Dependencias vacías para que se ejecute solo al montar/desmontar.

  const processImage = (image: HTMLImageElement) => {
    if (poseRef.current && isPoseReady) {
      poseRef.current.send({ image });
    } else {
        const msg = "El detector de poses no está listo.";
        setPoseError(msg);
        callbacksRef.current.onError(msg);
    }
  };

  return { isPoseReady, poseError, processImage };
};