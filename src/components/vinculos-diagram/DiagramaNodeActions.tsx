"use client";

import { createContext, useContext } from "react";

type DiagramaNodeActions = {
  dismissNode: (nodeId: string) => void;
};

const DiagramaNodeActionsContext = createContext<DiagramaNodeActions | null>(
  null,
);

export function DiagramaNodeActionsProvider({
  dismissNode,
  children,
}: {
  dismissNode: (nodeId: string) => void;
  children: React.ReactNode;
}) {
  return (
    <DiagramaNodeActionsContext.Provider value={{ dismissNode }}>
      {children}
    </DiagramaNodeActionsContext.Provider>
  );
}

export function useDiagramaNodeActions(): DiagramaNodeActions | null {
  return useContext(DiagramaNodeActionsContext);
}
