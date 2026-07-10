const fs = require('fs');
const file = 'src/components/bot/QuickConfigModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const importSelect = 'import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";';
const assets = `
const AVAILABLE_ASSETS = [
    { value: '1HZ10V', label: 'Volatility 10 (1s)' },
    { value: 'R_100', label: 'Volatility 100' },
    { value: 'frxEURUSD', label: 'EUR/USD' },
    { value: 'frxGBPUSD', label: 'GBP/USD' },
    { value: 'frxUSDJPY', label: 'USD/JPY' },
    { value: 'frxAUDUSD', label: 'AUD/USD' },
    { value: 'frxEURGBP', label: 'EUR/GBP' },
];
`;

content = content.replace(
    /import { toast } from "sonner";/,
    "import { toast } from \"sonner\";\n" + importSelect + "\n" + assets
);

content = content.replace(
    /duration, setDuration,/,
    "duration, setDuration,\n        asset, setAsset,"
);

content = content.replace(
    /const \[tempDuration, setTempDuration\] = useState<string \| number>\(duration \|\| 3\);/,
    "const [tempDuration, setTempDuration] = useState<string | number>(duration || 3);\n    const [tempAsset, setTempAsset] = useState<string>(asset || '1HZ10V');"
);

content = content.replace(
    /setTempStake\(initialStake\);/,
    "setTempStake(initialStake);\n            setTempAsset(asset || '1HZ10V');"
);

content = content.replace(
    /if \(typeof setDuration === 'function'\) setDuration\(finalDuration\);/,
    "if (typeof setDuration === 'function') setDuration(finalDuration);\n            if (typeof setAsset === 'function') setAsset(tempAsset);"
);

const assetHtml = `
                    <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-1.5 border-b border-white/5 pb-1">
                            <Zap className="h-3 w-3 text-cyan-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ativo Operacional</span>
                        </div>
                        <Select value={tempAsset} onValueChange={setTempAsset}>
                            <SelectTrigger className="w-full h-9 bg-slate-900/40 border-white/10 text-white font-bold">
                                <SelectValue placeholder="Selecione o Ativo" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-white/10 text-white">
                                {AVAILABLE_ASSETS.map((a) => (
                                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
`;

content = content.replace(
    /{?\/\* Seção 1: Gestão de Banca \*\/?}/,
    assetHtml + "\n                    {/* Seção 1: Gestão de Banca */}"
);

fs.writeFileSync(file, content);
