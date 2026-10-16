/* Worker classique : exécute le code Python de l'utilisateur avec Pyodide, hors du fil principal.
   Le fil principal peut le terminer si le code boucle à l'infini. */
importScripts('https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.js')

const HARNESS = String.raw`
import json, copy, time, io, contextlib, traceback

def _dec(v):
    if isinstance(v, dict) and set(v) == {"$big"}:
        return int(v["$big"])
    if isinstance(v, list):
        return [_dec(x) for x in v]
    return v

def _norm(v):
    if isinstance(v, tuple):
        v = list(v)
    if isinstance(v, list):
        return [_norm(x) for x in v]
    return v

def _eq(a, b, tol):
    if isinstance(b, bool) or isinstance(a, bool):
        return isinstance(a, bool) and isinstance(b, bool) and a == b
    if isinstance(a, float) or isinstance(b, float):
        if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
            return False
        t = 1e-9 if tol is None else tol
        return abs(a - b) <= t * max(1.0, abs(b))
    if isinstance(b, list):
        return isinstance(a, list) and len(a) == len(b) and all(_eq(x, y, tol) for x, y in zip(a, b))
    return a == b

def _show(v):
    s = repr(v)
    return s if len(s) <= 400 else s[:400] + "…"

def _user_tb():
    lines = traceback.format_exc().splitlines()
    keep, take = [], False
    for ln in lines:
        if 'File "solution.py"' in ln:
            take = True
        if take:
            keep.append(ln.replace('File "solution.py", ', ""))
    return "\n".join(keep[-8:]) if keep else lines[-1]

def _run(cfg_json):
    cfg = json.loads(cfg_json)
    out = {"tests": [], "error": None, "stdout": ""}
    buf = io.StringIO()
    ns = {"__name__": "__solution__"}
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(cfg["code"], "solution.py", "exec"), ns)
    except Exception:
        out["error"] = _user_tb()
        out["stdout"] = buf.getvalue()[-3000:]
        return json.dumps(out)
    f = ns.get(cfg["func"])
    if not callable(f):
        out["error"] = "La fonction %s(...) n'est pas définie." % cfg["func"]
        return json.dumps(out)
    for t in cfg["tests"]:
        args, exp = _dec(t["args"]), _dec(t["expected"])
        t0 = time.perf_counter()
        try:
            with contextlib.redirect_stdout(buf):
                got = _norm(f(*copy.deepcopy(args)))
            ms = (time.perf_counter() - t0) * 1000
            out["tests"].append({"ok": bool(_eq(got, exp, cfg.get("tol"))), "got": _show(got), "expected": _show(exp),
                                 "args": _show(args)[1:-1], "ms": round(ms, 2)})
        except Exception:
            out["tests"].append({"ok": False, "error": _user_tb(), "expected": _show(exp), "args": _show(args)[1:-1],
                                 "ms": round((time.perf_counter() - t0) * 1000, 2)})
    out["stdout"] = buf.getvalue()[-3000:]
    return json.dumps(out)
`

let ready = null
function init() {
  ready ||= (async () => {
    const py = await loadPyodide()
    py.runPython(HARNESS)
    return py
  })()
  return ready
}

self.onmessage = async ({ data }) => {
  const { id, kind } = data
  try {
    const py = await init()
    if (kind === 'init') return self.postMessage({ id, ok: true })
    const run = py.globals.get('_run')
    const result = JSON.parse(run(data.payload))
    run.destroy()
    self.postMessage({ id, ok: true, result })
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e?.message || e) })
  }
}
