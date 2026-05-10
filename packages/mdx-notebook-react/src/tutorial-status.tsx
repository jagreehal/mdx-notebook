import type { Manifest } from "mdx-notebook-core";

export interface TutorialStatusProps {
  manifest: Manifest;
  title?: string;
}

function fmtDifficulty(v: string | undefined): string {
  if (!v) return "Unknown";
  return `${v.slice(0, 1).toUpperCase()}${v.slice(1)}`;
}

export function TutorialStatus({ manifest, title = "Tutorial status" }: TutorialStatusProps) {
  const tutorial = manifest.tutorial;
  const checkpoints = manifest.checkpoints ?? [];
  const progress = manifest.progress;

  if (!tutorial && checkpoints.length === 0 && !progress) return null;

  return (
    <aside className="mdx-nb-tutorial-status" aria-label="Tutorial status">
      <h3 className="mdx-nb-tutorial-status-title">{title}</h3>

      {tutorial ? (
        <dl className="mdx-nb-tutorial-meta">
          <div><dt>Lesson</dt><dd>{tutorial.title ?? tutorial.lessonId ?? "Untitled"}</dd></div>
          <div><dt>Difficulty</dt><dd>{fmtDifficulty(tutorial.difficulty)}</dd></div>
          {tutorial.estimatedMinutes !== undefined ? <div><dt>Estimated</dt><dd>{tutorial.estimatedMinutes} min</dd></div> : null}
          {tutorial.prerequisites?.length ? (
            <div><dt>Prerequisites</dt><dd>{tutorial.prerequisites.join(", ")}</dd></div>
          ) : null}
        </dl>
      ) : null}

      {checkpoints.length > 0 ? (
        <section className="mdx-nb-checkpoints" aria-label="Checkpoints">
          <h4>Checkpoints</h4>
          <ul>
            {checkpoints.map((c) => (
              <li key={c.id} className={c.passed ? "mdx-nb-checkpoint-ok" : "mdx-nb-checkpoint-fail"}>
                <span className="mdx-nb-checkpoint-icon" aria-hidden="true">{c.passed ? "✓" : "✗"}</span>
                <span>{c.title ?? c.id}</span>
                {!c.passed && c.message ? <small>{c.message}</small> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {progress ? (
        <section className="mdx-nb-progress-summary" aria-label="Progress summary">
          <h4>Progress</h4>
          <p>{progress.percent}% complete ({progress.requiredPassed}/{progress.requiredTotal} required)</p>
          {progress.prerequisites.missing.length > 0 ? (
            <p className="mdx-nb-progress-blocked">Blocked by: {progress.prerequisites.missing.join(", ")}</p>
          ) : (
            <p className="mdx-nb-progress-ready">Prerequisites satisfied</p>
          )}
        </section>
      ) : null}
    </aside>
  );
}
