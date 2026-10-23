const FAQ = [
  [
    "How is goal progress calculated?",
    "Each goal uses one method you choose: linked tasks (completed ÷ linked tasks), a measurable number (for example 120 of 300 problems) or a manual percentage.",
  ],
  [
    "How do I link a task to a goal?",
    "Open the task form (Add Task or Edit) and pick a goal in the Goal field. The goal's progress updates when linked tasks are completed.",
  ],
  [
    "Where does Focus Time come from?",
    "From sessions saved by the Focus Timer. If you haven't tracked any yet, the dashboard shows planned time from your completed timed tasks and labels it 'Planned'.",
  ],
  [
    "What happens when I delete a goal?",
    "The goal is removed. Tasks linked to it are kept and simply unlinked.",
  ],
  [
    "Can I use the app on my phone?",
    "Yes. The layout adapts to tablets and phones, and the sidebar collapses to icons on small screens.",
  ],
];

const SHORTCUTS = [
  ["Ctrl / ⌘ + K", "Focus the search box"],
  ["Esc", "Close dialogs and menus, leave search"],
  ["Tab / Shift + Tab", "Move between controls (dialogs keep focus inside)"],
];

export default function HelpPage() {
  return (
    <main className="content">
      <div className="page-title">
        <div>
          <h1>Help &amp; Support</h1>
          <p>Answers to common questions.</p>
        </div>
      </div>

      <section className="panel" style={{ padding: 20, marginBottom: 14 }}>
        <h2 className="section-title">Frequently asked questions</h2>
        <div className="pi-faq">
          {FAQ.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="panel" style={{ padding: 20 }}>
        <h2 className="section-title">Keyboard shortcuts</h2>
        <dl className="pi-shortcuts">
          {SHORTCUTS.map(([keys, text]) => (
            <div key={keys}>
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
        <p className="pi-muted" style={{ marginTop: 16 }}>
          Found a problem or have an idea? Contact the app owner or open an issue in your project
          repository.
        </p>
      </section>
    </main>
  );
}
