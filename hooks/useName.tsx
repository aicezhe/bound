"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import NameModal from "@/components/NameModal";

const KEY = "bound_name";
const listeners = new Set<() => void>();
let memoryName: string | null = null; // если localStorage недоступен

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(KEY) ?? memoryName;
  } catch {
    return memoryName;
  }
}

function writeName(name: string) {
  memoryName = name;
  try {
    localStorage.setItem(KEY, name);
  } catch {}
  listeners.forEach((cb) => cb());
}

const noopSubscribe = () => () => {};

interface NameContextValue {
  name: string | null;
  openChange: () => void;
}

const NameContext = createContext<NameContextValue>({ name: null, openChange: () => {} });

export function NameProvider({ children }: { children: ReactNode }) {
  const name = useSyncExternalStore(subscribe, getSnapshot, () => null);
  // до гидрации не знаем, есть ли имя, и модалку не показываем, чтобы она не мигала
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [changing, setChanging] = useState(false);

  const openChange = useCallback(() => setChanging(true), []);
  const showModal = hydrated && (!name || changing);

  return (
    <NameContext.Provider value={{ name, openChange }}>
      {children}
      {showModal && (
        <NameModal
          initial={name ?? ""}
          canClose={Boolean(name)}
          onSubmit={(n) => {
            writeName(n);
            setChanging(false);
          }}
          onClose={() => setChanging(false)}
        />
      )}
    </NameContext.Provider>
  );
}

export const useName = () => useContext(NameContext);
