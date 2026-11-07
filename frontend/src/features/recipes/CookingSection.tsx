"use client";

import { ActionIcon, Button, Group, Modal, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import type { CookingLog, Recipe } from "@/shared/api/types";
import {
  cookingLogsQuery,
  deleteCookingLog,
  refreshAfterCookingLogChange,
} from "./api";
import classes from "./RecipeDetail.module.css";

// 作った記録の欄（F-42）。詳細の API は新しい順に3件まで返すので、それを出す
export function CookingSection({
  recipeId,
  cooking,
}: {
  recipeId: number;
  cooking: Recipe["cooking"];
}) {
  const [expanded, setExpanded] = useState(false);
  // 全部の記録は「ほかの記録を表示」を押してから取りに行く
  const allLogs = useQuery({
    ...cookingLogsQuery(recipeId),
    enabled: expanded,
  });
  const [deleting, setDeleting] = useState<CookingLog | null>(null);
  const logs = expanded && allLogs.data ? allLogs.data : cooking.recent_logs;
  const hiddenCount = cooking.count - logs.length;

  return (
    <section className={classes.sub}>
      <div className={classes.cookHead}>
        <h2 className={classes.sectionTitle}>作った記録</h2>
        {cooking.count > 0 && cooking.last_cooked_on && (
          <>
            <span className={classes.cookStat}>
              <b>{cooking.count}</b>回
            </span>
            <span className={classes.cookStat}>
              最後に作った日 <b>{shortDate(cooking.last_cooked_on)}</b>
            </span>
          </>
        )}
      </div>
      {cooking.count === 0 ? (
        <p className={classes.empty}>まだありません</p>
      ) : (
        <ul className={classes.records}>
          {logs.map((log) => (
            <li key={log.id}>
              <time dateTime={log.cooked_on}>{longDate(log.cooked_on)}</time>
              <p>{log.note}</p>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`${longDate(log.cooked_on)} の記録を削除`}
                onClick={() => setDeleting(log)}
              >
                ✕
              </ActionIcon>
            </li>
          ))}
        </ul>
      )}
      {!expanded && hiddenCount > 0 && (
        <Button
          variant="subtle"
          color="gray"
          mt={6}
          onClick={() => setExpanded(true)}
        >
          ほかの記録を表示（{hiddenCount}件）
        </Button>
      )}

      <DeleteLogDialog
        recipeId={recipeId}
        log={deleting}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
}

// D-03 作った記録の削除の確認
function DeleteLogDialog({
  recipeId,
  log,
  onClose,
}: {
  recipeId: number;
  log: CookingLog | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  // 閉じる動きの間も文言が消えないよう、最後に選んだ記録を覚えておく
  const [shown, setShown] = useState<CookingLog | null>(log);
  if (log !== null && log !== shown) {
    setShown(log);
  }

  const remove = useMutation({
    mutationFn: deleteCookingLog,
    onSuccess: () => {
      refreshAfterCookingLogChange(queryClient, recipeId);
      notifications.show({ color: "green", message: "記録を削除しました" });
      onClose();
    },
    onError: (error) => {
      // 別の画面で消されていたときは、取り直して閉じる
      if (error instanceof ApiError && error.status === 404) {
        refreshAfterCookingLogChange(queryClient, recipeId);
        onClose();
      }
    },
  });

  return (
    <Modal
      opened={log !== null}
      onClose={onClose}
      title="この記録を削除しますか？"
      centered
    >
      <Text>
        {shown && longDate(shown.cooked_on)}{" "}
        の記録を削除します。元に戻せません。
      </Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>
          やめる
        </Button>
        <Button
          color="red"
          loading={remove.isPending}
          onClick={() => log && remove.mutate(log.id)}
        >
          削除する
        </Button>
      </Group>
    </Modal>
  );
}

// 2026-11-03 → 2026/11/03
function longDate(date: string): string {
  return date.replaceAll("-", "/");
}

// 2026-11-03 → 11/3
function shortDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}
