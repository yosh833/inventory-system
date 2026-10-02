import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../api/client';
import { VoiceCommandParsed, VoiceCommandResult } from '../types';

interface UseVoiceOptions {
  onResult?: (result: VoiceCommandResult) => void;
  onError?: (error: string) => void;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedCommand, setParsedCommand] = useState<VoiceCommandParsed | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'es-MX';
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.maxAlternatives = 1;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError('Reconocimiento de voz no soportado en este navegador');
      return;
    }

    if (isListening) return;

    setError(null);
    setTranscript('');
    setParsedCommand(null);
    setPreview(null);

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      // Reset silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      silenceTimerRef.current = setTimeout(() => {
        if (finalTranscript && recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 1500);
    };

    recognition.onerror = (event) => {
      setError(`Error de reconocimiento: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = async () => {
      setIsListening(false);
      
      if (transcript.trim()) {
        await processCommand(transcript.trim());
      }
    };

    try {
      recognition.start();
    } catch (err) {
      setError('No se pudo iniciar el micrófono');
      console.error(err);
    }
  }, [isListening, transcript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const processCommand = async (text: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      // First parse locally for quick feedback
      const response = await api.parseVoiceText(text);
      const parsed = response.data;
      setParsedCommand(parsed);

      if (parsed.requiresConfirmation) {
        // Show preview for confirmation
        const previewResponse = await api.processVoiceCommand(parsed, false);
        setPreview(previewResponse.data?.preview);
      } else {
        // Execute directly
        const result = await api.processVoiceCommand(parsed, true);
        options.onResult?.(result.data);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error procesando comando';
      setError(message);
      options.onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmCommand = async () => {
    if (!parsedCommand) return;
    
    setIsProcessing(true);
    try {
      const result = await api.processVoiceCommand(parsedCommand, true);
      setPreview(null);
      options.onResult?.(result.data);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message;
      setError(message);
      options.onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelCommand = () => {
    setParsedCommand(null);
    setPreview(null);
    setTranscript('');
  };

  const clearError = () => setError(null);

  return {
    isListening,
    isProcessing,
    transcript,
    parsedCommand,
    preview,
    error,
    startListening,
    stopListening,
    confirmCommand,
    cancelCommand,
    clearError
  };
}