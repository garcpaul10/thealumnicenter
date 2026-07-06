/** Real uploaded photo if one exists for this slot (see apps/admin's "Site Photos" page), otherwise a stable Picsum placeholder seeded by slot key — see CLAUDE.md §5/§11 on why Picsum, not a guessed hotlink. */
export function resolveImage(images: Record<string, string>, slotKey: string, width: number, height: number): string {
  return images[slotKey] ?? `https://picsum.photos/seed/alumni-${slotKey.replace(":", "-")}/${width}/${height}`;
}
