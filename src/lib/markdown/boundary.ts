export function findStableBoundary(markdown: string): number {
  const linePattern = markdown.match(/.*(?:\n|$)/g) ?? [];
  let offset = 0;
  let stableEnd = 0;
  let inFence = false;
  let fenceChar: string | undefined;

  for (const line of linePattern) {
    if (line === "") break;
    offset += line.length;
    const trimmed = line.trim();
    const lineComplete = line.endsWith("\n");

    const fence = trimmed.match(/^(`{3,}|~{3,})/);
    if (fence) {
      const marker = fence[1]?.[0];
      if (!inFence) {
        inFence = true;
        fenceChar = marker;
      } else if (marker === fenceChar) {
        inFence = false;
        stableEnd = offset;
      }
      continue;
    }

    if (inFence) continue;

    if (trimmed === "") {
      stableEnd = offset;
    } else if (lineComplete && /^#{1,6}\s+/.test(trimmed)) {
      stableEnd = offset;
    } else if (lineComplete && /^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      stableEnd = offset;
    }
  }

  return stableEnd;
}
