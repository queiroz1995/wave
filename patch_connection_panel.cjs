const fs = require('fs');
let content = fs.readFileSync('src/components/bot/ConnectionPanel.tsx', 'utf8');

// Add broker from useBotContext
content = content.replace(
    /accountType, setAccountType,/,
    "accountType, setAccountType,\n        broker, setBroker,\n        pumabrokerToken, setPumabrokerToken,\n        pumabrokerUserId, setPumabrokerUserId,"
);

// Add the UI logic to switch brokers
const replacement = `
    const currentToken = accountType === 'real' ? realToken : demoToken;

    return (
        <div className="w-full flex flex-col gap-3 bg-slate-950/40 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-1 mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Acesso Seguro</span>
                </div>
                {isConnected && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] py-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                        Conectado
                    </Badge>
                )}
            </div>

            {!isConnected && (
                <div className="flex items-center gap-2 mb-2">
                    <Select value={broker} onValueChange={(val: any) => setBroker(val)} disabled={isConnecting}>
                        <SelectTrigger className="w-full h-8 text-xs bg-black/40 border-white/10 text-white">
                            <SelectValue placeholder="Selecione a Corretora" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="deriv">Deriv</SelectItem>
                            <SelectItem value="pumabroker">PumaBroker</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {broker === 'deriv' ? (
                <>
                    <div className="flex items-center gap-2 mb-1">
                        <Select value={accountType} onValueChange={(val: 'real' | 'demo') => setAccountType(val)} disabled={isConnected || isConnecting}>
                            <SelectTrigger className="w-[120px] h-8 text-xs bg-black/40 border-white/10 text-white focus:ring-0">
                                <Wallet className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                <SelectItem value="demo">Demo Account</SelectItem>
                                <SelectItem value="real">Real Account</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <Input
                                type={showToken ? "text" : "password"}
                                placeholder="Token API"
                                value={currentToken}
                                onChange={(e) => accountType === 'real' ? setRealToken(e.target.value) : setDemoToken(e.target.value)}
                                disabled={isConnected || isConnecting}
                                className="pl-8 pr-8 h-8 text-xs bg-black/40 border-white/10 focus:border-indigo-500/50 text-white placeholder:text-slate-600 transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowToken(!showToken)}
                                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
                            >
                                {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {!isConnected && (
                        <div className="flex flex-col gap-2 mb-1">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                    <User className="h-3.5 w-3.5 text-slate-500" />
                                </div>
                                <Input
                                    type="text"
                                    placeholder="User ID (ex: 32820)"
                                    value={pumabrokerUserId}
                                    onChange={(e) => setPumabrokerUserId(e.target.value)}
                                    disabled={isConnected || isConnecting}
                                    className="pl-8 pr-8 h-8 text-xs bg-black/40 border-white/10 focus:border-indigo-500/50 text-white placeholder:text-slate-600 transition-colors"
                                />
                            </div>
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                    <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                                </div>
                                <Input
                                    type={showToken ? "text" : "password"}
                                    placeholder="Bearer Token (eyJh...)"
                                    value={pumabrokerToken}
                                    onChange={(e) => setPumabrokerToken(e.target.value)}
                                    disabled={isConnected || isConnecting}
                                    className="pl-8 pr-8 h-8 text-xs bg-black/40 border-white/10 focus:border-indigo-500/50 text-white placeholder:text-slate-600 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowToken(!showToken)}
                                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
                                >
                                    {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
`;

content = content.replace(/const currentToken = accountType === 'real' \? realToken : demoToken;[\s\S]*?(?=<div className="flex items-center gap-2 mt-2">)/m, replacement);
fs.writeFileSync('src/components/bot/ConnectionPanel.tsx', content);
