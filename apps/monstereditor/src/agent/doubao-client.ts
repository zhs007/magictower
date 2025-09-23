import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const PROTO_PATH = path.join(process.cwd(), 'protos', 'doubao.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const doubaoProto = grpc.loadPackageDefinition(packageDefinition).doubao as any;

const GRPC_URL = process.env.DOUBAO_GRPC_URL;

if (!GRPC_URL) {
  throw new Error('DOUBAO_GRPC_URL environment variable not set');
}

const client = new doubaoProto.GenDoubaoImage(GRPC_URL, grpc.credentials.createInsecure());

export function generateImage(prompt: string): Promise<Buffer[]> {
  return new Promise((resolve, reject) => {
    client.GenerateImage(
      {
        prompt,
        max_images: 1,
      },
      (error: grpc.ServiceError | null, response: { images: Buffer[] }) => {
        if (error) {
          console.error('Error calling GenDoubaoImage:', error);
          return reject(error);
        }
        resolve(response.images);
      },
    );
  });
}
