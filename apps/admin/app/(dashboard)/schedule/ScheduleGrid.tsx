"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import type { ScheduleBlock, ScheduleMode, Space, Sport } from "../../../lib/types";
import { createBlockAction, moveBlockAction, updateBlockAction, deleteBlockAction } from "./actions";

const START_HOUR = 6;
const END_HOUR = 23;
const SLOT_MINUTES = 30;
const SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
const SLOT_HEIGHT_PX = 22;
const DEFAULT_DURATION_MINUTES = 60;

const MODE_STYLES: Record<ScheduleMode, string> = {
  open_play: "bg-blue-100 border-blue-400 text-blue-900",
  reservable: "bg-amber-100 border-amber-400 text-amber-900",
  league: "bg-purple-100 border-purple-400 text-purple-900",
  camp: "bg-green-100 border-green-400 text-green-900",
  closed: "bg-slate-200 border-slate-400 text-slate-700",
};

const MODE_LABELS: Record<ScheduleMode, string> = {
  open_play: "Open Play",
  reservable: "Reservable",
  league: "League",
  camp: "Camp",
  closed: "Closed",
};

function slotToDate(date: string, slotIndex: number): Date {
  const minutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
  const d = new Date(`${date}T00:00:00`);
  d.setMinutes(minutes);
  return d;
}

function dateToSlotOffset(date: string, iso: string): number {
  const dayStart = new Date(`${date}T00:00:00`);
  dayStart.setHours(START_HOUR, 0, 0, 0);
  const diffMinutes = (new Date(iso).getTime() - dayStart.getTime()) / 60000;
  return diffMinutes / SLOT_MINUTES;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function PaletteChip({ mode }: { mode: ScheduleMode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${mode}`,
    data: { type: "palette", mode },
  });
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      className={`cursor-grab rounded-md border px-3 py-1.5 text-xs font-medium ${MODE_STYLES[mode]} ${isDragging ? "opacity-40" : ""}`}
    >
      {MODE_LABELS[mode]}
    </button>
  );
}

function GridCell({ spaceId, slotIndex }: { spaceId: string; slotIndex: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${spaceId}-${slotIndex}`, data: { spaceId, slotIndex } });
  return (
    <div
      ref={setNodeRef}
      className={`border-b border-r border-slate-100 ${isOver ? "bg-brand/10" : ""}`}
      style={{ height: SLOT_HEIGHT_PX }}
    />
  );
}

function BlockChip({
  block,
  date,
  sportName,
  onSelect,
}: {
  block: ScheduleBlock;
  date: string;
  sportName: string;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `block-${block.id}`,
    data: { type: "block", block },
  });
  const top = dateToSlotOffset(date, block.startsAt) * SLOT_HEIGHT_PX;
  const height = dateToSlotOffset(date, block.endsAt) * SLOT_HEIGHT_PX - top;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onSelect}
      className={`absolute left-0.5 right-0.5 cursor-grab overflow-hidden rounded-md border px-1.5 py-0.5 text-[11px] leading-tight ${MODE_STYLES[block.mode]} ${isDragging ? "opacity-40" : ""}`}
      style={{ top, height: Math.max(height, SLOT_HEIGHT_PX) }}
    >
      <div className="font-semibold">{MODE_LABELS[block.mode]}</div>
      <div>{sportName}</div>
      <div>
        {formatTime(new Date(block.startsAt))}–{formatTime(new Date(block.endsAt))}
      </div>
    </div>
  );
}

export function ScheduleGrid({
  date,
  spaces,
  blocks,
  sports,
}: {
  date: string;
  spaces: Space[];
  blocks: ScheduleBlock[];
  sports: Sport[];
}) {
  const router = useRouter();
  const [paletteSportId, setPaletteSportId] = useState<string>(sports[0]?.id ?? "");
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sportName = (id: string | null) => sports.find((s) => s.id === id)?.name ?? "Multi-sport";

  async function handleDragEnd(event: DragEndEvent) {
    setError(null);
    const { active, over } = event;
    if (!over) return;
    const cellData = over.data.current as { spaceId: string; slotIndex: number } | undefined;
    if (!cellData) return;

    const newStart = slotToDate(date, cellData.slotIndex);

    if (active.data.current?.type === "palette") {
      const mode = active.data.current.mode as ScheduleMode;
      const newEnd = new Date(newStart.getTime() + DEFAULT_DURATION_MINUTES * 60000);
      const result = await createBlockAction({
        spaceId: cellData.spaceId,
        sportId: paletteSportId || undefined,
        mode,
        startsAt: newStart.toISOString(),
        endsAt: newEnd.toISOString(),
      });
      if (result.error) setError(result.error);
      router.refresh();
      return;
    }

    if (active.data.current?.type === "block") {
      const block = active.data.current.block as ScheduleBlock;
      const durationMs = new Date(block.endsAt).getTime() - new Date(block.startsAt).getTime();
      const newEnd = new Date(newStart.getTime() + durationMs);
      const result = await moveBlockAction({
        id: block.id,
        spaceId: cellData.spaceId,
        startsAt: newStart.toISOString(),
        endsAt: newEnd.toISOString(),
      });
      if (result.error) setError(result.error);
      router.refresh();
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <span className="text-xs font-medium text-slate-500">Drag onto the grid to create a block:</span>
        {(Object.keys(MODE_LABELS) as ScheduleMode[]).map((mode) => (
          <PaletteChip key={mode} mode={mode} />
        ))}
        <select
          value={paletteSportId}
          onChange={(e) => setPaletteSportId(e.target.value)}
          className="ml-2 rounded-md border border-slate-300 px-2 py-1 text-xs"
        >
          <option value="">Multi-sport / none</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <DndContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <div className="flex">
            <div className="w-16 shrink-0 border-r border-slate-200">
              <div className="h-8 border-b border-slate-200" />
              {Array.from({ length: SLOTS }).map((_, i) => (
                <div key={i} style={{ height: SLOT_HEIGHT_PX }} className="border-b border-slate-100 pr-1 text-right text-[10px] text-slate-400">
                  {i % 2 === 0 ? formatTime(slotToDate(date, i)) : ""}
                </div>
              ))}
            </div>
            {spaces.map((space) => (
              <div key={space.id} className="relative w-48 shrink-0 border-r border-slate-200 last:border-r-0">
                <div className="flex h-8 items-center justify-center border-b border-slate-200 text-xs font-semibold">
                  {space.name}
                </div>
                <div className="relative">
                  {Array.from({ length: SLOTS }).map((_, slotIndex) => (
                    <GridCell key={slotIndex} spaceId={space.id} slotIndex={slotIndex} />
                  ))}
                  {blocks
                    .filter((b) => b.spaceId === space.id)
                    .map((block) => (
                      <BlockChip
                        key={block.id}
                        block={block}
                        date={date}
                        sportName={sportName(block.sportId)}
                        onSelect={() => setSelectedBlock(block)}
                      />
                    ))}
                </div>
              </div>
            ))}
            {spaces.length === 0 && <p className="p-6 text-sm text-slate-400">No active spaces yet.</p>}
          </div>
        </div>
      </DndContext>

      {selectedBlock && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4" onClick={() => setSelectedBlock(null)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 font-semibold">{MODE_LABELS[selectedBlock.mode]} block</h3>
            <form
              action={async (formData) => {
                await updateBlockAction(formData);
                setSelectedBlock(null);
                router.refresh();
              }}
              className="space-y-3"
            >
              <input type="hidden" name="id" value={selectedBlock.id} />
              <label className="block text-xs text-slate-500">
                Starts at
                <input
                  name="startsAt"
                  type="datetime-local"
                  defaultValue={new Date(selectedBlock.startsAt).toISOString().slice(0, 16)}
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Ends at
                <input
                  name="endsAt"
                  type="datetime-local"
                  defaultValue={new Date(selectedBlock.endsAt).toISOString().slice(0, 16)}
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Recurrence rule (RRULE, optional)
                <input
                  name="recurrenceRule"
                  defaultValue={selectedBlock.recurrenceRule ?? ""}
                  placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex items-center justify-between pt-2">
                <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                  Save
                </button>
                <button type="button" onClick={() => setSelectedBlock(null)} className="text-sm text-slate-500 hover:underline">
                  Cancel
                </button>
              </div>
            </form>
            <form
              action={async (formData) => {
                await deleteBlockAction(formData);
                setSelectedBlock(null);
                router.refresh();
              }}
              className="mt-3 border-t border-slate-100 pt-3"
            >
              <input type="hidden" name="id" value={selectedBlock.id} />
              <button type="submit" className="text-sm text-red-600 hover:underline">
                Delete block
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
