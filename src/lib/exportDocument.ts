import { asBlob } from 'html-docx-js-typescript';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportAsTxt(plainText: string): void {
  const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, 'document.txt');
}

export async function exportAsDocx(html: string): Promise<void> {
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
  const result = await asBlob(fullHtml);
  // In a browser this is always a Blob; the Buffer branch only applies to
  // the library's Node.js code path, which never runs here.
  const blob =
    result instanceof Blob
      ? result
      : new Blob([new Uint8Array(result)], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
  downloadBlob(blob, 'document.docx');
}
