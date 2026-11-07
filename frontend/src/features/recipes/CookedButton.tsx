"use client";

import { Button, Group, Modal, Stack, Textarea } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { ApiError } from "@/shared/api/client";
import { createCookingLog, refreshAfterCookingLogChange } from "./api";

// 「作った」ボタンと、D-02 作った記録を残す窓
export function CookedButton({ recipeId }: { recipeId: number }) {
  const [opened, dialog] = useDisclosure(false);

  return (
    <>
      <Button onClick={dialog.open}>作った</Button>
      <Modal
        opened={opened}
        onClose={dialog.close}
        title="作った記録を残す"
        centered
      >
        {/* 窓を閉じると中身が消えるので、開くたびに今日の日付と空のメモから始まる */}
        <CookedForm recipeId={recipeId} onClose={dialog.close} />
      </Modal>
    </>
  );
}

function CookedForm({
  recipeId,
  onClose,
}: {
  recipeId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const today = dayjs().format("YYYY-MM-DD");
  const form = useForm<{ cooked_on: string | null; note: string }>({
    initialValues: { cooked_on: today, note: "" },
  });

  const save = useMutation({
    mutationFn: (values: typeof form.values) =>
      createCookingLog(recipeId, values),
    onSuccess: (log) => {
      refreshAfterCookingLogChange(queryClient, recipeId);
      notifications.show({
        color: "green",
        title: "記録しました",
        message: `${log.cooked_on.replaceAll("-", "/")} に作った記録を残しました`,
      });
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        form.setErrors(
          Object.fromEntries(
            Object.entries(error.errors).map(([key, messages]) => [
              key,
              messages[0],
            ]),
          ),
        );
      }
      // 別の画面でレシピが消されていたときは、取り直して 404 の画面を出す
      if (error instanceof ApiError && error.status === 404) {
        refreshAfterCookingLogChange(queryClient, recipeId);
        onClose();
      }
    },
  });

  return (
    <form noValidate onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="md">
        <DatePickerInput
          label="作った日"
          withAsterisk
          locale="ja"
          firstDayOfWeek={0}
          valueFormat="YYYY/MM/DD"
          maxDate={today}
          allowDeselect={false}
          {...form.getInputProps("cooked_on")}
        />
        <Textarea
          label="ひとことメモ"
          placeholder="例：塩を減らしたらちょうどよかった"
          description="200文字まで"
          inputWrapperOrder={["label", "input", "description", "error"]}
          autosize
          minRows={2}
          maxLength={200}
          {...form.getInputProps("note")}
        />
      </Stack>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>
          やめる
        </Button>
        <Button type="submit" loading={save.isPending}>
          記録する
        </Button>
      </Group>
    </form>
  );
}
