import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('copyText', () => {
  it('hands the pending text to ClipboardItem when the browser has it', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    class FakeItem {
      readonly items: Record<string, Promise<Blob>>;
      constructor(items: Record<string, Promise<Blob>>) {
        this.items = items;
      }
    }
    vi.stubGlobal('ClipboardItem', FakeItem);
    vi.stubGlobal('navigator', { clipboard: { write, writeText: vi.fn() } });

    await copyText(Promise.resolve('# Título'));

    const [item] = write.mock.calls[0]?.[0] as FakeItem[];
    expect(await (await item?.items['text/plain'])?.text()).toBe('# Título');
  });

  it('falls back to writeText', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('ClipboardItem', undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await copyText(Promise.resolve('# Título'));

    expect(writeText).toHaveBeenCalledWith('# Título');
  });
});
