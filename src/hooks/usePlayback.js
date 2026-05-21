import { useEffect, useRef, useState } from "react";

export function usePlayback(totalSteps, speed) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isPlaying || totalSteps <= 1) {
      return undefined;
    }

    if (currentStep >= totalSteps - 1) {
      setIsPlaying(false);
      return undefined;
    }

    timerRef.current = window.setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }, speed);

    return () => {
      window.clearTimeout(timerRef.current);
    };
  }, [currentStep, isPlaying, speed, totalSteps]);

  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [totalSteps]);

  return {
    currentStep,
    isPlaying,
    setCurrentStep,
    setIsPlaying,
    play: () => {
      setIsPlaying(true);
    },
    pause: () => {
      setIsPlaying(false);
    },
    toggle: () => {
      setIsPlaying((value) => !value);
    },
    reset: () => {
      setCurrentStep(0);
      setIsPlaying(false);
    },
    stepForward: () => {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    },
    stepBackward: () => {
      setCurrentStep((prev) => Math.max(prev - 1, 0));
    },
  };
}
