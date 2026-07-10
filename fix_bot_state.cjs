const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useBotState.ts', 'utf8');

const brokenSection = `if (!savedStateJSON) return {
        broker, setBroker,
        pumabrokerToken, setPumabrokerToken,
        pumabrokerUserId, setPumabrokerUserId,
        realToken, setRealToken] = useState(initialState.realToken);`;

const correctSection = `if (!savedStateJSON) return { ...DEFAULTS };
        return JSON.parse(savedStateJSON);
    } catch (e) {
        return { ...DEFAULTS };
    }
};

const initialState = getInitialState();

export const useBotState = () => {
    const [realToken, setRealToken] = useState(initialState.realToken);`;

content = content.replace(brokenSection, correctSection);

fs.writeFileSync('src/hooks/bot/useBotState.ts', content);
