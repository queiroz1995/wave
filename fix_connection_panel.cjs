const fs = require('fs');

let code = fs.readFileSync('src/components/bot/ConnectionPanel.tsx', 'utf8');

code = code.replace(
    /accountBalance, accountId\n    } = useBotContext\(\);/,
    "accountBalance, accountId, appId, setAppId\n    } = useBotContext();"
);

code = code.replace(
    /const \[showToken, setShowToken\] = useState\(false\);/,
    "const [showToken, setShowToken] = useState(false);\n    const [showAdvanced, setShowAdvanced] = useState(false);"
);

const advancedSection = `
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-[10px] text-slate-400 hover:text-cyan-400 font-bold uppercase tracking-wider text-left transition-colors"
                        >
                            {showAdvanced ? "Ocultar Configurações Avançadas" : "Configurações Avançadas (App ID)"}
                        </button>
                        
                        {showAdvanced && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <div className="relative">
                                    <Input
                                        type="text"
                                        value={appId}
                                        onChange={(e) => setAppId(e.target.value)}
                                        placeholder="App ID (Ex: 1089)"
                                        className="h-9 text-xs pl-3 pr-3 rounded-xl bg-slate-900/40 border-white/10 focus-visible:ring-cyan-500/30"
                                    />
                                </div>
                                <div className="px-3 py-2 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-start gap-2">
                                    <Info className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-[8px] text-amber-300 font-bold uppercase tracking-wider leading-relaxed">
                                        Se você estiver recebendo erro de "Origem Inválida" ou "App ID", crie um App ID na Deriv com o link do seu site.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>`;

code = code.replace(
    /<div className="px-3 py-2 bg-cyan-500\/5 border border-cyan-500\/10 rounded-lg flex items-start gap-2">[\s\S]*?<\/div>/,
    advancedSection
);

fs.writeFileSync('src/components/bot/ConnectionPanel.tsx', code);
