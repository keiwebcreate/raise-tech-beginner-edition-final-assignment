"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import type { ReactNode } from "react";
import classes from "./SortableRows.module.css";

type HandleRef = (element: Element | null) => void;

function SortableRow({
  id,
  index,
  children,
}: {
  id: string;
  index: number;
  children: (handleRef: HandleRef) => ReactNode;
}) {
  const { ref, handleRef, isDragSource } = useSortable({ id, index });

  return (
    <div ref={ref} className={classes.row} data-dragging={isDragSource}>
      {children(handleRef)}
    </div>
  );
}

// 行の並び替え（詳細設計書 5.2）。つまみをドラッグするか、
// つまみにフォーカスして Space で持ち上げ、矢印キーで動かし、Space で置く
export function SortableRows<T extends { key: string }>({
  items,
  onMove,
  renderRow,
}: {
  items: T[];
  onMove: (from: number, to: number) => void;
  renderRow: (item: T, index: number, handleRef: HandleRef) => ReactNode;
}) {
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { source } = event.operation;
        if (!event.canceled && isSortable(source)) {
          const { initialIndex, index } = source;
          if (initialIndex !== index) {
            onMove(initialIndex, index);
          }
        }
      }}
    >
      <div className={classes.rows}>
        {items.map((item, index) => (
          <SortableRow key={item.key} id={item.key} index={index}>
            {(handleRef) => renderRow(item, index, handleRef)}
          </SortableRow>
        ))}
      </div>
    </DragDropProvider>
  );
}

export function DragHandle({
  handleRef,
  label,
}: {
  handleRef: HandleRef;
  label: string;
}) {
  return (
    <button
      type="button"
      ref={handleRef}
      className={classes.handle}
      aria-label={label}
      title="ドラッグで並び替え"
    >
      ⋮⋮
    </button>
  );
}
