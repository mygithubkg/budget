declare module "mammoth" {
  export interface MammothResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export interface MammothOptions {
    arrayBuffer?: ArrayBuffer;
    buffer?: Buffer;
    path?: string;
  }

  export function convertToHtml(
    input: MammothOptions,
    options?: any
  ): Promise<MammothResult>;

  export function extractRawText(
    input: MammothOptions,
    options?: any
  ): Promise<MammothResult>;
}
