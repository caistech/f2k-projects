"use client";

import { createContext, useContext } from "react";

export interface AgentContextValue {
  name: string;
  /** Estates this agent may see: subset of ['seafields','branscombe']. */
  estateAccess: string[];
}

const AgentContext = createContext<AgentContextValue>({
  name: "",
  estateAccess: [],
});

export function AgentProvider({
  value,
  children,
}: {
  value: AgentContextValue;
  children: React.ReactNode;
}) {
  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent(): AgentContextValue {
  return useContext(AgentContext);
}

export function canAccess(access: string[], estate: string): boolean {
  return Array.isArray(access) && access.includes(estate);
}
