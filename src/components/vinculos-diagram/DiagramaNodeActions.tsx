"use client";

import { createContext, useContext } from "react";

type DiagramaNodeActions = {
  dismissNode: (nodeId: string) => void;
  openResumo: (nodeId: string) => void;
};

const DiagramaNodeActionsContext = createContext<DiagramaNodeActions | null>(
  null,
);

export function DiagramaNodeActionsProvider({
  dismissNode,
  openResumo,
  children,
}: {
  dismissNode: (nodeId: string) => void;
  openResumo: (nodeId: string) => void;
  children: React.ReactNode;
}) {
  return (
    <DiagramaNodeActionsContext.Provider value={{ dismissNode, openResumo }}>
      {children}
    </DiagramaNodeActionsContext.Provider>
  );
}

export function useDiagramaNodeActions(): DiagramaNodeActions | null {
  return useContext(DiagramaNodeActionsContext);
}
