import { useSyncExternalStore } from "react";
import { FOLDER_KEY, PROJECTS_KEY } from "./storageKeys";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function notify() {
  listeners.forEach((l) => l());
}

function readFolder(): string | null {
  return localStorage.getItem(FOLDER_KEY);
}

let cachedRaw: string | null = null;
let cachedProjects: string[] = [];

function readProjects(): string[] {
  const raw = localStorage.getItem(PROJECTS_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed: unknown = JSON.parse(raw ?? "[]");
      cachedProjects = Array.isArray(parsed)
        ? parsed.filter((p): p is string => typeof p === "string")
        : [];
    } catch {
      cachedProjects = [];
    }
  }
  return cachedProjects;
}

function writeProjects(projects: string[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  notify();
}

/** Adds a folder to the Manage project list, once. */
export function addProject(folder: string) {
  const projects = readProjects();
  if (!projects.includes(folder)) writeProjects([...projects, folder]);
}

/** Takes a folder off the Manage project list; files are left alone. */
export function removeProject(folder: string) {
  writeProjects(readProjects().filter((p) => p !== folder));
}

/**
 * Sets or clears the folder the Installer installs into. A chosen folder
 * also joins the Manage project list.
 */
export function setProjectFolder(folder: string | null) {
  if (folder) {
    localStorage.setItem(FOLDER_KEY, folder);
    addProject(folder);
  } else {
    localStorage.removeItem(FOLDER_KEY);
  }
  notify();
}

/** Opens the native folder picker and returns the folder, or null if cancelled. */
export function pickFolder(): Promise<string | null> {
  return window.api.chooseFolder();
}

/** Opens the native folder picker and makes the choice the install target. */
export async function chooseProjectFolder() {
  const folder = await pickFolder();
  if (folder) setProjectFolder(folder);
}

/** The Installer's target folder, or null to install globally. */
export function useProjectFolder(): string | null {
  return useSyncExternalStore(subscribe, readFolder);
}

/** Folders listed on the Manage Project tab. */
export function useProjects(): string[] {
  return useSyncExternalStore(subscribe, readProjects);
}

/** Last path segment, used as a folder's display name. */
export function folderName(folder: string): string {
  return folder.split(/[\\/]/).filter(Boolean).pop() ?? folder;
}
