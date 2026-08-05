const fs = require('fs');

// Patch useBotState.ts
let stateContent = fs.readFileSync('src/hooks/bot/useBotState.ts', 'utf8');

const integratedTokenDef = `export const INTEGRATED_DERIV_TOKEN = '33yxEj8JnVc9XRyM6aB2n';\nexport const DEFAULT_DERIV_APP_ID = '1089';`;

stateContent = stateContent.replace("export const DEFAULT_DERIV_APP_ID = '1089';", integratedTokenDef);
stateContent = stateContent.replace("realToken: '',", "realToken: INTEGRATED_DERIV_TOKEN,");
stateContent = stateContent.replace("demoToken: '',", "demoToken: INTEGRATED_DERIV_TOKEN,");

// Update getInitialState fallback
stateContent = stateContent.replace(
    /appId: !savedState\.appId \? DEFAULT_DERIV_APP_ID : savedState\.appId,/,
    `realToken: savedState.realToken || INTEGRATED_DERIV_TOKEN,\n            demoToken: savedState.demoToken || INTEGRATED_DERIV_TOKEN,\n            appId: !savedState.appId ? DEFAULT_DERIV_APP_ID : savedState.appId,`
);

fs.writeFileSync('src/hooks/bot/useBotState.ts', stateContent);

// Patch ConnectionPanel.tsx
let panelContent = fs.readFileSync('src/components/bot/ConnectionPanel.tsx', 'utf8');

// Add quick button if token empty or button to load integrated token
if (!panelContent.includes('INTEGRATED_DERIV_TOKEN')) {
    panelContent = panelContent.replace(
        "import { DerivDiagnosticTool } from './DerivDiagnosticTool';",
        "import { DerivDiagnosticTool } from './DerivDiagnosticTool';\nimport { INTEGRATED_DERIV_TOKEN } from '@/hooks/bot/useBotState';"
    );
    
    // Add quick button inside the token input section
    const tokenInputSection = `<div className="relative">`;
    const updatedTokenInputSection = `<div className="flex items-center justify-between px-0.5">
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
                    </div>
                    <div className="relative">`;
                    
    panelContent = panelContent.replace(tokenInputSection, updatedTokenInputSection);
}

fs.writeFileSync('src/components/bot/ConnectionPanel.tsx', panelContent);
console.log('Patched token successfully!');
