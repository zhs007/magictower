import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { getProjectRoot, loadEnvOnce } from '../config/env';

// Ensure env is loaded
loadEnvOnce();

// Always resolve the proto from the repo root
const PROTO_PATH = path.join(getProjectRoot(), 'protos', 'rmbg.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const rmbgProto = grpc.loadPackageDefinition(packageDefinition).rmbg as any;

const GRPC_URL = process.env.RMBG_GRPC_URL;

if (!GRPC_URL) {
  throw new Error('RMBG_GRPC_URL environment variable not set');
}

// Re-use the same IP/DNS resolution logic from doubao-client
function isIpv4Host(host: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(host);
}

function toResolvedTarget(raw: string): string {
  const lastColon = raw.lastIndexOf(':');
  const host = lastColon > 0 ? raw.slice(0, lastColon) : raw;
  if (isIpv4Host(host)) {
    return `ipv4:${raw}`;
  }
  return `dns:${raw}`;
}

const RESOLVED_TARGET = toResolvedTarget(GRPC_URL);

// Basic diagnostics at startup
try {
  // eslint-disable-next-line no-console
  console.info('[rmbg-client] init', {
    target: GRPC_URL,
    resolvedTarget: RESOLVED_TARGET,
  });
} catch {}

const client = new rmbgProto.RmbgService(RESOLVED_TARGET, grpc.credentials.createInsecure(), {
  'grpc.enable_http_proxy': 0,
});

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
      console.info('[rmbg-client] channel state before waitForReady', {
        state: connectivityName(before),
      });
      const deadline = new Date(Date.now() + Math.max(1, timeoutMs));
      client.waitForReady(deadline, (err?: Error) => {
        const after = channel.getConnectivityState(false);
        if (err) {
          // eslint-disable-next-line no-console
          console.error('[rmbg-client] waitForReady failed', {
            error: err?.message,
            state: connectivityName(after),
            target: GRPC_URL,
          });
          return reject(err);
        }
        // eslint-disable-next-line no-console
        console.info('[rmbg-client] waitForReady OK', {
          state: connectivityName(after),
        });
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}

export function removeBackground(imageData: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Ensure the connection is established
    waitForClientReady(10000)
      .then(() => {
        client.RemoveBackground(
          {
            image_data: imageData,
          },
          (error: grpc.ServiceError | null, response: { image_data: Buffer }) => {
            if (error) {
              console.error('Error calling RemoveBackground:', {
                code: error.code,
                details: error.details,
                message: error.message,
              });
              return reject(error);
            }
            resolve(response.image_data);
          },
        );
      })
      .catch((err) => {
        // Surface the waitForReady failure early
        reject(err);
      });
  });
}
