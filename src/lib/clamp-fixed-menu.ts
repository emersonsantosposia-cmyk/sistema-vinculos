/** Mantém um menu `position: fixed` dentro da viewport (evita corte no rodapé/laterais). */
export function clampFixedMenuPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  margin = 8,
): { x: number; y: number } {
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  return {
    x: Math.min(Math.max(x, margin), maxX),
    y: Math.min(Math.max(y, margin), maxY),
  };
}
