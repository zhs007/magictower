import { ProxyAgent, setGlobalDispatcher } from 'undici';

let proxyConfigured = false;

export function configureProxyFromEnv() {
    if (proxyConfigured) return;
    proxyConfigured = true;

    const httpsProxy = process.env.HTTPS_PROXY;
    const httpProxy = process.env.HTTP_PROXY;
    const proxyUrl = httpsProxy || httpProxy;

    if (!proxyUrl) return;

    try {
        const agent = new ProxyAgent(proxyUrl);
        setGlobalDispatcher(agent);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[agent] Failed to configure proxy agent:', error);
    }
}
