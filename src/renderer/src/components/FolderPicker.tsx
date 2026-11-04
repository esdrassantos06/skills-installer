import {
  chooseProjectFolder,
  folderName,
  setProjectFolder,
  useProjectFolder,
} from "../lib/projectFolder";

/** "Choose Folder" while no folder is chosen, then the folder's chip with a remove button. */
export function FolderPicker({ disabled = false }: { disabled?: boolean }) {
  const folder = useProjectFolder();
  const name = folder && folderName(folder);
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {folder && (
        <span
          title={folder}
          className="inline-flex min-w-0 items-center gap-1 rounded-md border border-accent/40 bg-accent-soft py-0.5 pr-0.5 pl-2 font-mono text-[11.5px]"
        >
          <span aria-hidden className="text-subtle">
            cwd=
          </span>
          <span className="truncate text-accent">{name}</span>
          <button
            onClick={() => setProjectFolder(null)}
            disabled={disabled}
            aria-label="Remove folder"
            className="ml-0.5 rounded px-1.5 py-0.5 text-muted transition hover:bg-err/10 hover:text-err disabled:opacity-40"
          >
            ✕
          </button>
        </span>
      )}
      {!folder && (
        <button
          onClick={() => void chooseProjectFolder()}
          disabled={disabled}
          className="shrink-0 rounded-md border border-dashed border-border-strong px-2.5 py-1 text-[11.5px] text-muted transition hover:border-accent hover:text-accent disabled:opacity-40"
        >
          Choose Folder
        </button>
      )}
    </span>
  );
}
