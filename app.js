let editor, fontSize = 18;
let tabs = ["print('Hello PythonC')"];
let activeTab = 0;
let aiEnabled = false;
const MAX_CHARS = 50000;

require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs" }});
require(["vs/editor/editor.main"], () => {
  editor = monaco.editor.create(document.getElementById("editor"), {
    value: tabs[0],
    language: "python",
    theme: "vs-dark",
    fontSize,
    automaticLayout: true
  });
});

function toggleTheme() {
  document.body.classList.toggle("light");
  document.body.classList.toggle("dark");
  monaco.editor.setTheme(
    document.body.classList.contains("light") ? "vs" : "vs-dark"
  );
}

function toggleAI() {
  aiEnabled = !aiEnabled;
  document.getElementById("aiStatus").textContent =
    aiEnabled ? "AI Enabled" : "AI Off";
}

function zoomIn() { fontSize += 2; updateFont(); }
function zoomOut() { fontSize = Math.max(12, fontSize - 2); updateFont(); }
function zoomReset() { fontSize = 18; updateFont(); }

function updateFont() {
  editor.updateOptions({ fontSize });
}

function runCode() {
  const code = editor.getValue();
  if (code.length > MAX_CHARS) {
    alert("Code too large");
    return;
  }

  document.getElementById("output").textContent = "";

  Sk.configure({
    output: t => document.getElementById("output").textContent += t,
    read: x => Sk.builtinFiles["files"][x],
    inputfun: () => document.getElementById("stdin").value
  });

  Sk.misceval.asyncToPromise(() =>
    Sk.importMainWithBody("<stdin>", false, code, true)
  ).catch(e => {
    document.getElementById("output").textContent = e.toString();
    if (aiEnabled) explainErrorAI(code, e.toString());
  });
}

async function explainErrorAI(code, error) {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const res = await fetch("/api/explain-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, error }),
      signal: controller.signal
    });

    const data = await res.json();
    document.getElementById("output").textContent +=
      "\n\nAI:\n" + data.ai;
  } catch {
    document.getElementById("output").textContent +=
      "\n\nAI timeout";
  }
}

function clearOutput() {
  document.getElementById("output").textContent = "";
}

document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key === "Enter") runCode();
});