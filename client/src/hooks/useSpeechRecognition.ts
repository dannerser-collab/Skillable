import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

function getSpeechConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as SpeechWindow;
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const [isSupported] = useState<boolean>(() => getSpeechConstructor() !== null);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignorar si ya estaba detenido
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechConstructor();
    if (!Ctor) return;

    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignorar
    }

    const recognition = new Ctor();
    recognition.lang = 'es-ES';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
      setInterimText('');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalChunk += piece;
        } else {
          interim += piece;
        }
      }
      setInterimText(interim.trim());
      if (finalChunk.trim()) {
        onTranscriptRef.current(finalChunk.trim());
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError('No se pudo capturar audio del micrófono.');
      }
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!isSupported) return;
    if (isListening) stopListening();
    else startListening();
  }, [isListening, isSupported, startListening, stopListening]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignorar
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimText,
    error,
    toggleListening,
    stopListening,
  };
}
