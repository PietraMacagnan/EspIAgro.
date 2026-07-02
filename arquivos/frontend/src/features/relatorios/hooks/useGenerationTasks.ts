import { useCallback, useEffect, useRef, useState } from "react";

import {
  GENERATION_TASK_STATUS,
  type GenerationTask,
  type GenerationTaskType,
  type Relatorio,
} from "../types/relatorio.types";
import {
  getGenerationStage,
  getGenerationStartedMessage,
  getReportDisplayTitle,
} from "../utils/relatorio.helpers";

type ProgressIntervalId = ReturnType<typeof window.setInterval>;

type UseGenerationTasksReturn = {
  tasks: GenerationTask[];
  createGenerationTask: (
    relatorio: Relatorio,
    type: GenerationTaskType,
  ) => GenerationTask;
  upsertGenerationTask: (task: GenerationTask) => void;
  updateGenerationTask: (
    taskId: string,
    updates: Partial<GenerationTask>,
  ) => void;
  dismissGenerationTask: (taskId: string) => void;
  isGenerationRunning: (
    relatorioId: number,
    type: GenerationTaskType,
  ) => boolean;
  getRelatorioFromTask: (relatorioId: number) => Relatorio | null;
  startProgressSimulation: (task: GenerationTask) => ProgressIntervalId;
  stopProgressSimulation: (intervalId: ProgressIntervalId) => void;
};

export function useGenerationTasks(): UseGenerationTasksReturn {
  const intervalIdsRef = useRef<ProgressIntervalId[]>([]);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);

  useEffect(() => {
    return () => {
      intervalIdsRef.current.forEach((intervalId) => {
        window.clearInterval(intervalId);
      });

      intervalIdsRef.current = [];
    };
  }, []);

  const createGenerationTask = useCallback(
    (relatorio: Relatorio, type: GenerationTaskType): GenerationTask => {
      const progress = 8;

      return {
        id: `${type}-${relatorio.id}`,
        relatorioId: relatorio.id,
        relatorioTitle: getReportDisplayTitle(relatorio),
        type,
        status: GENERATION_TASK_STATUS.RUNNING,
        message: getGenerationStartedMessage(type),
        stage: getGenerationStage(
          type,
          progress,
          GENERATION_TASK_STATUS.RUNNING,
        ),
        progress,
        startedAt: new Date().toISOString(),
      };
    },
    [],
  );

  const upsertGenerationTask = useCallback((task: GenerationTask): void => {
    setTasks((current) => [
      task,
      ...current.filter(
        (item) =>
          !(item.relatorioId === task.relatorioId && item.type === task.type),
      ),
    ]);
  }, []);

  const updateGenerationTask = useCallback(
    (taskId: string, updates: Partial<GenerationTask>): void => {
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                ...updates,
              }
            : task,
        ),
      );
    },
    [],
  );

  const dismissGenerationTask = useCallback((taskId: string): void => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }, []);

  const isGenerationRunning = useCallback(
    (relatorioId: number, type: GenerationTaskType): boolean => {
      return tasks.some(
        (task) =>
          task.relatorioId === relatorioId &&
          task.type === type &&
          task.status === GENERATION_TASK_STATUS.RUNNING,
      );
    },
    [tasks],
  );

  const getRelatorioFromTask = useCallback(
    (relatorioId: number): Relatorio | null => {
      return (
        tasks.find((task) => task.relatorioId === relatorioId && task.relatorio)
          ?.relatorio ?? null
      );
    },
    [tasks],
  );

  const startProgressSimulation = useCallback(
    (task: GenerationTask): ProgressIntervalId => {
      const intervalId = window.setInterval(() => {
        setTasks((current) =>
          current.map((item) => {
            if (
              item.id !== task.id ||
              item.status !== GENERATION_TASK_STATUS.RUNNING
            ) {
              return item;
            }

            const increment = task.type === "completo" ? 5 : 6;
            const nextProgress = Math.min(item.progress + increment, 92);

            return {
              ...item,
              progress: nextProgress,
              stage: getGenerationStage(
                task.type,
                nextProgress,
                GENERATION_TASK_STATUS.RUNNING,
              ),
            };
          }),
        );
      }, 1100);

      intervalIdsRef.current = [...intervalIdsRef.current, intervalId];

      return intervalId;
    },
    [],
  );

  const stopProgressSimulation = useCallback(
    (intervalId: ProgressIntervalId): void => {
      window.clearInterval(intervalId);

      intervalIdsRef.current = intervalIdsRef.current.filter(
        (item) => item !== intervalId,
      );
    },
    [],
  );

  return {
    tasks,
    createGenerationTask,
    upsertGenerationTask,
    updateGenerationTask,
    dismissGenerationTask,
    isGenerationRunning,
    getRelatorioFromTask,
    startProgressSimulation,
    stopProgressSimulation,
  };
}