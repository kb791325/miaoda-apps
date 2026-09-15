import { toast } from 'sonner';
import type { ProductWithInventory } from '@shared/api.interface';

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): void {
  const chars = text.split('');
  let line = '';
  let lines = 0;
  for (let i = 0; i < chars.length; i += 1) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      if (lines >= maxLines - 1) {
        let trimmed = line;
        while (
          ctx.measureText(trimmed + '…').width > maxWidth &&
          trimmed.length > 0
        ) {
          trimmed = trimmed.slice(0, -1);
        }
        ctx.fillText(trimmed + '…', x, y + lines * lineHeight);
        return;
      }
      ctx.fillText(line, x, y + lines * lineHeight);
      line = chars[i];
      lines += 1;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y + lines * lineHeight);
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getQrImgHtml(labelEl: HTMLElement, size: number): string {
  const qrCanvas = labelEl.querySelector('canvas');
  if (qrCanvas) {
    return `<img src="${qrCanvas.toDataURL()}" width="${size}" height="${size}" />`;
  }
  const temp = document.createElement('canvas');
  const ctx = temp.getContext('2d');
  if (!ctx) return '';
  temp.width = size;
  temp.height = size;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  return `<img src="${temp.toDataURL()}" width="${size}" height="${size}" />`;
}

export function downloadProductLabel(
  product: ProductWithInventory,
  labelEl: HTMLElement,
): void {
  const canvas = labelEl.querySelector('canvas');
  if (!canvas) {
    toast.error('QR 码未就绪');
    return;
  }
  const labelCanvas = document.createElement('canvas');
  const scale = 3;
  const labelW = 60 * 3.78 * scale;
  const labelH = 40 * 3.78 * scale;
  labelCanvas.width = labelW;
  labelCanvas.height = labelH;
  const ctx = labelCanvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, labelW, labelH);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, labelW - 2, labelH - 2);

  const qrSize = 110 * scale;
  const qrX = 20 * scale;
  const qrY = (labelH - qrSize) / 2;
  ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize);

  const textX = qrX + qrSize + 20 * scale;
  const textWidth = labelW - textX - 20 * scale;
  let textY = 30 * scale;

  ctx.fillStyle = '#1f2937';
  ctx.font = `600 ${14 * scale}px Inter, "Noto Sans SC", sans-serif`;
  ctx.textBaseline = 'top';
  wrapText(ctx, product.name, textX, textY, textWidth, 18 * scale, 2);
  textY += 36 * scale;

  ctx.fillStyle = '#6b7280';
  ctx.font = `${11 * scale}px JetBrains Mono, monospace`;
  ctx.fillText(product.code, textX, textY);
  textY += 20 * scale;

  if (product.spec) {
    ctx.fillStyle = '#6b7280';
    ctx.font = `${11 * scale}px Inter, "Noto Sans SC", sans-serif`;
    wrapText(ctx, `规格：${product.spec}`, textX, textY, textWidth, 16 * scale, 1);
    textY += 18 * scale;
  }

  ctx.fillStyle = '#6b7280';
  ctx.font = `${11 * scale}px Inter, "Noto Sans SC", sans-serif`;
  ctx.fillText(`单位：${product.unit}`, textX, textY);
  textY += 22 * scale;

  ctx.fillStyle = 'hsl(205, 80%, 58%)';
  ctx.font = `700 ${20 * scale}px JetBrains Mono, monospace`;
  ctx.fillText(`¥${product.unitPrice.toFixed(2)}`, textX, textY);

  const link = document.createElement('a');
  link.download = `label-${product.code}.png`;
  link.href = labelCanvas.toDataURL('image/png');
  link.click();
  toast.success('标签已下载');
}

export function printProductLabel(
  product: ProductWithInventory,
  labelEl: HTMLElement,
): void {
  const printWindow = window.open('', '_blank', 'width=600,height=500');
  if (!printWindow) {
    toast.error('无法打开打印窗口，请检查浏览器弹窗设置');
    return;
  }
  const qrSvg = getQrImgHtml(labelEl, 110);
  const html = `
<!DOCTYPE html>
<html><head><title>商品标签 - ${product.code}</title>
<style>
  @page { size: 60mm 40mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Inter, "Noto Sans SC", system-ui, sans-serif; width: 60mm; height: 40mm; padding: 3mm; }
  .label { display: flex; align-items: flex-start; gap: 3mm; width: 100%; height: 100%; border: 1px solid #e5e7eb; padding: 3mm; }
  .qr { flex-shrink: 0; }
  .qr svg { display: block; }
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1.5mm; }
  .name { font-size: 12px; font-weight: 600; line-height: 1.3; color: #1f2937; word-break: break-all; }
  .code { font-family: JetBrains Mono, monospace; font-size: 10px; color: #6b7280; }
  .spec { font-size: 9px; color: #6b7280; word-break: break-all; }
  .unit { font-size: 9px; color: #6b7280; }
  .price { font-family: JetBrains Mono, monospace; font-size: 16px; font-weight: 700; color: hsl(205, 80%, 58%); margin-top: auto; }
</style></head><body>
  <div class="label">
    <div class="qr">${qrSvg}</div>
    <div class="info">
      <div class="name">${escapeHtml(product.name)}</div>
      <div class="code">${escapeHtml(product.code)}</div>
      ${product.spec ? `<div class="spec">规格：${escapeHtml(product.spec)}</div>` : ''}
      <div class="unit">单位：${escapeHtml(product.unit)}</div>
      <div class="price">¥${product.unitPrice.toFixed(2)}</div>
    </div>
  </div>
<script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }</script>
</body></html>`;
  printWindow.document.write(html);
  printWindow.document.close();
}
