/** The report's styles: light and dark colours, the icicle, tables, and a phone layout. */
const DARK = `--bg:#0f1115;--fg:#f3f4f6;--muted:#c2c7d0;--rule:#2a2f38;--graph-rule:#343a45;--frame-border:#8b93a1;--focus:#93c5fd;--fail:#f97066;--ok:#5bd38a;--hatch:rgba(0,0,0,.28);--index-bar:#5b6474;--row-target:#1c2433;--c1:#315a73;--c2:#6d5111;--c3:#0d5041;--c4:#624157;--c5:#5f5b22;--c6:#6b3a24;--c7:#0d3e5c;--c8:#3b5a2e;--c-test:#3a342b;--c-unknown:#3a4150;--c-group:#2b2f36;color-scheme:dark;`;

export const REPORT_CSS: string = `
:root{--bg:#fff;--fg:#111827;--muted:#4b5563;--rule:#e2e5ea;--graph-rule:#d5d9e0;--frame-border:#6b7280;--focus:#1d4ed8;--fail:#b42318;--ok:#157f3b;--hatch:rgba(0,0,0,.1);--index-bar:#9aa3b2;--row-target:#eef2ff;--c1:#b3ddf5;--c2:#f4d48c;--c3:#8cd3c0;--c4:#e8c3d7;--c5:#f8f3aa;--c6:#f2bfa6;--c7:#8cc0dc;--c8:#c9dfb8;--c-test:#f3ebdd;--c-unknown:#d9dee7;--c-group:#e5e7eb;--font-ui:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;--font-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${DARK}}}
:root[data-theme="dark"]{${DARK}}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-ui)}
.page{max-width:75rem;margin:0 auto;padding:1.5rem 16px 3rem;display:grid;gap:1.5rem}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
h1,h2,h3,p{margin:0}
h1{font-size:1.75rem}
h2{font-size:1.15rem;font-weight:600;font-family:var(--font-mono);overflow-wrap:break-word}
h2.index-h{font-family:var(--font-ui);font-size:1.1rem}
h3{font-size:1rem;margin-top:.75rem}
a{color:var(--focus)}
:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.test:focus{outline:none}
code,.eyebrow{font-family:var(--font-mono)}
.eyebrow{font-size:.78rem;color:var(--muted)}
.top{display:grid;gap:.3rem;border-bottom:1px solid var(--rule);padding-bottom:1rem}
.meta,.figures,.foot,.define{color:var(--muted);font-size:.9rem}
.figures b{color:var(--fg);font-variant-numeric:tabular-nums}
.ref{font-size:.75em;vertical-align:super;text-decoration:none;margin-left:1px}
.foot{border-top:1px solid var(--rule);padding-top:1rem;display:grid;gap:.4rem;max-width:72ch}
.define{max-width:72ch}
main{display:grid;gap:1.5rem;min-width:0}
#index,.test{display:grid;gap:.75rem;min-width:0}
.test{display:none}
.test:target,.test.only{display:grid}
main:has(.test:target) #index,main:has(.test.only) #index{display:none}
.back{font-size:.9rem;justify-self:start}
.test-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:.5rem 1rem}
.result{font-size:.85rem;font-weight:600}
.ok{color:var(--ok)}.bad{color:var(--fail)}.skip{color:var(--muted)}
.warn{color:var(--fail);font-size:.9rem}
.hot{display:flex;flex-wrap:wrap;gap:.25rem .6rem;align-items:baseline;font-size:.85rem;color:var(--muted)}
.hot-label{font-weight:600}
.hot-path{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.25rem .4rem;font-family:var(--font-mono);font-size:.8rem;color:var(--fg)}
.hot-path li+li::before{content:"→";color:var(--muted);margin-right:.4rem}
.table-wrap{overflow-x:auto;min-width:0}
table{border-collapse:collapse;min-width:min(100%,46rem);font-size:.85rem;font-variant-numeric:tabular-nums}
th,td{padding:.4rem .7rem;border-bottom:1px solid var(--rule);text-align:right;white-space:nowrap;vertical-align:middle}
th:first-child,.text{text-align:left}
thead th{font-size:.78rem;color:var(--muted);font-weight:600}
tbody th{font-family:var(--font-mono);font-weight:500;white-space:normal;overflow-wrap:anywhere}
.kind,.range{display:block;font-family:var(--font-ui);font-size:.72rem;color:var(--muted);font-weight:400}
.tag{font-family:var(--font-ui);font-size:.7rem;color:var(--fail);border:1px solid currentColor;border-radius:3px;padding:0 .25rem;margin-left:.25rem}
.cell-name{display:grid;gap:.3rem}
.bar-mini{display:block;height:4px;width:var(--w);background:var(--index-bar);border-radius:2px}
tr:target{background:var(--row-target)}
.graph-fig{margin:.5rem 0 0;display:grid;gap:.6rem;min-width:0}
figcaption{font-size:.85rem;color:var(--muted);max-width:80ch}
.legend{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.4rem 1rem;font-size:.82rem;color:var(--muted)}
.legend li{display:flex;align-items:center;gap:.4rem}
.sw{width:.9rem;height:.9rem;box-sizing:border-box;border:1px solid var(--frame-border);border-radius:2px;background:var(--fill)}
.graph{border:1px solid var(--graph-rule);border-radius:6px;padding:.5rem;min-width:0;overflow:hidden}
.icicle,.kids{list-style:none;margin:0;padding:0;display:flex;min-width:0}
.kids{gap:1px;margin-top:1px}
.f{width:var(--w);flex:0 1 auto;min-width:2px;overflow:hidden;display:flex;flex-direction:column}
.bar,.self{height:1.75rem;box-sizing:border-box;border:1px solid var(--frame-border);border-radius:2px;container-type:inline-size;overflow:hidden;white-space:nowrap;font-variant-numeric:tabular-nums}
.bar{background:var(--fill);font-size:.75rem;line-height:calc(1.75rem - 2px)}
.bar .l-full,.bar .l-mid,.bar .l-fn,.self span{display:none;overflow:hidden;text-overflow:ellipsis;padding:0 .35rem}
@container (min-width:2.75rem){.bar .l-fn{display:block}}
@container (min-width:10.5rem){.bar .l-fn{display:none}.bar .l-mid{display:block}}
@container (min-width:16.25rem){.bar .l-mid{display:none}.bar .l-full{display:block}}
.self{width:var(--w);flex:0 1 auto;min-width:2px;background:color-mix(in srgb,var(--fill) 40%,transparent);border-style:dashed}
.self span{font-size:.7rem;line-height:calc(1.75rem - 2px)}
@container (min-width:2.25rem){.self .s-min{display:block}}
@container (min-width:6.5rem){.self .s-min{display:none}.self .s-mid{display:block}}
@container (min-width:16.25rem){.self .s-mid{display:none}.self .s-full{display:block}}
.sw.self-sw{background:color-mix(in srgb,var(--fill) 40%,transparent);border-style:dashed}
.c-1{--fill:var(--c1)}.c-2{--fill:var(--c2)}.c-3{--fill:var(--c3)}.c-4{--fill:var(--c4)}.c-5{--fill:var(--c5)}.c-6{--fill:var(--c6)}.c-7{--fill:var(--c7)}.c-8{--fill:var(--c8)}
.c-test{--fill:var(--c-test)}.c-unknown{--fill:var(--c-unknown)}.c-group{--fill:var(--c-group)}
.failed>.bar,.sw.failed{border-left:3px solid var(--fail);background-image:repeating-linear-gradient(135deg,transparent 0 5px,var(--hatch) 5px 7px)}
.precompile>.bar,.sw.precompile{border-style:dotted;border-width:2px}
.group>.bar,.sw.c-group{background-image:radial-gradient(var(--hatch) 1px,transparent 1.2px);background-size:5px 5px}
.notes{margin:0;padding-left:1.25rem;display:grid;gap:.4rem;color:var(--muted);font-size:.88rem;max-width:72ch}
.notes li:target{color:var(--fg)}
@media (max-width:640px){
table{min-width:0;width:100%}
thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
tbody tr{display:grid;grid-template-columns:1fr 1fr;gap:.15rem 1rem;padding:.6rem 0;border-bottom:1px solid var(--rule)}
tbody th,tbody td{border:0;padding:0;text-align:left;white-space:normal}
tbody th{grid-column:1/-1}
tbody td::before{content:attr(data-label);display:block;font-size:.7rem;color:var(--muted)}
}`;
