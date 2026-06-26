declare module 'node-vault' {
  interface VaultOptions {
    apiVersion?: string;
    endpoint?: string;
    token?: string;
  }

  interface VaultClient {
    read(path: string): Promise<{ data: { data: Record<string, string> } }>;
  }

  export default function vault(options: VaultOptions): VaultClient;
}
