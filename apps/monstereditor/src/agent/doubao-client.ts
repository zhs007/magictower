import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { getProjectRoot, loadEnvOnce } from '../config/env';

// Ensure env is loaded (supports app-level and repo-level .env files)
loadEnvOnce();

// Always resolve the proto from the repo root to avoid cwd issues
const PROTO_PATH = path.join(getProjectRoot(), 'protos', 'doubao.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const doubaoProto = grpc.loadPackageDefinition(packageDefinition).doubao as any;

const GRPC_URL = process.env.DOUBAO_GRPC_URL;
const HTTP_PROXY = process.env.HTTP_PROXY;
const HTTPS_PROXY = process.env.HTTPS_PROXY;
let NO_PROXY = process.env.NO_PROXY;

if (!GRPC_URL) {
  throw new Error('DOUBAO_GRPC_URL environment variable not set');
}

function isIpv4Host(host: string): boolean {
  // simplistic check for dotted-quad
  return /^\d+\.\d+\.\d+\.\d+$/.test(host);
}

function toResolvedTarget(raw: string): string {
  const lastColon = raw.lastIndexOf(':');
  const host = lastColon > 0 ? raw.slice(0, lastColon) : raw;
  if (isIpv4Host(host)) {
    return `ipv4:${raw}`; // e.g., ipv4:127.0.0.1:50052
  }
  // Fallback to DNS resolver
  return `dns:${raw}`; // e.g., dns:localhost:50052 or dns:myhost:50052
}

const RESOLVED_TARGET = toResolvedTarget(GRPC_URL);

// Ensure proxies do NOT apply to our gRPC target (grpc-js honors NO_PROXY)
try {
  const lastColon = GRPC_URL.lastIndexOf(':');
  const targetHost = lastColon > 0 ? GRPC_URL.slice(0, lastColon) : GRPC_URL;
  const defaults = ['localhost', '127.0.0.1'];
  const current = (NO_PROXY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const h of [targetHost, ...defaults]) {
    if (!current.includes(h)) current.push(h);
  }
  NO_PROXY = current.join(',');
  process.env.NO_PROXY = NO_PROXY; // set before creating any clients
} catch {}

// Basic diagnostics at startup
try {
  // eslint-disable-next-line no-console
  console.info('[doubao-client] init', {
    target: GRPC_URL,
    resolvedTarget: RESOLVED_TARGET,
    HTTP_PROXY,
    HTTPS_PROXY,
    NO_PROXY,
  });
} catch {}

const client = new doubaoProto.GenDoubaoImage(RESOLVED_TARGET, grpc.credentials.createInsecure());

function connectivityName(state: grpc.connectivityState): string {
  // Reverse lookup on the numeric enum to get a human-readable name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const name = (grpc.connectivityState as any)[state];
  return typeof name === 'string' ? name : String(state);
}

function waitForClientReady(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const channel = client.getChannel();
      const before = channel.getConnectivityState(false);
      // eslint-disable-next-line no-console
      console.info('[doubao-client] channel state before waitForReady', {
        state: connectivityName(before),
      });
      const deadline = new Date(Date.now() + Math.max(1, timeoutMs));
      client.waitForReady(deadline, (err?: Error) => {
        const after = channel.getConnectivityState(false);
        if (err) {
          // eslint-disable-next-line no-console
          console.error('[doubao-client] waitForReady failed', {
            error: err?.message,
            state: connectivityName(after),
            target: GRPC_URL,
          });
          return reject(err);
        }
        // eslint-disable-next-line no-console
        console.info('[doubao-client] waitForReady OK', {
          state: connectivityName(after),
        });
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}

export function generateImage(prompt: string): Promise<Buffer[]> {
  return new Promise((resolve, reject) => {
    // Ensure the connection is established (provides clearer errors)
  waitForClientReady(10000)
      .then(() => {
        client.GenerateImage(
      {
        prompt,
        max_images: 1,
      },
      (error: grpc.ServiceError | null, response: { images: Buffer[] }) => {
        if (error) {
          console.error('Error calling GenDoubaoImage:', {
            code: error.code,
            details: error.details,
            message: error.message,
          });
          return reject(error);
        }
        resolve(response.images);
      },
    );
      })
      .catch((err) => {
        // Surface the waitForReady failure early
        reject(err);
      });
  });
}
