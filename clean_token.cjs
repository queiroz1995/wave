const fs = require('fs');

// 1. Clean useBotState.ts
let state = fs.readFileSync('src/hooks/bot/useBotState.ts', 'utf8');
state = state.replace("export const INTEGRATED_DERIV_TOKEN = '33yxEj8JnVc9XRyM6aB2n';\n", "");
state = state.replace("realToken: INTEGRATED_DERIV_TOKEN,", "realToken: '',");
state = state.replace("demoToken: INTEGRATED_DERIV_TOKEN,", "demoToken: '',");
state = state.replace("realToken: savedState.realToken || INTEGRATED_DERIV_TOKEN,", "realToken: savedState.realToken || '',");
state = state.replace("demoToken: savedState.demoToken || INTEGRATED_DERIV_TOKEN,", "demoToken: savedState.demoToken || '',");
fs.writeFileSync('src/hooks/bot/useBotState.ts', state);

// 2. Clean ConnectionPanel.tsx
let panel = fs.readFileSync('src/components/bot/ConnectionPanel.tsx', 'utf8');
panel = panel.replace("import { INTEGRATED_DERIV_TOKEN } from '@/hooks/bot/useBotState';\n", "");
panel = panel.replace(`                    <div className="flex items-center justify-between px-0.5">
                        <span className="text-[9px] font-bold text-slate-400">Token Deriv</span>
                        <button
                            type="button"
                            onClick={() => {
                                setRealToken(INTEGRATED_DERIV_TOKEN);
                                setDemoToken(INTEGRATED_DERIV_TOKEN);
                            }}
                            className="text-[8px] font-black text-cyan-400 hover:underline uppercase tracking-wider"
                        >
                            Usar Token Integrado (33yxEj...)
                        </button>
                    </div>`, "");
fs.writeFileSync('src/components/bot/ConnectionPanel.tsx', panel);

console.log('Cleaned all integrated tokens from memory and UI.');
