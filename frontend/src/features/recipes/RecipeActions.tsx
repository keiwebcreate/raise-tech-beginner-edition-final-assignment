"use client";

import { Button, Group, Modal, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ApiError } from "@/shared/api/client";
import type { Recipe } from "@/shared/api/types";
import { copyRecipe, deleteRecipe, recipeQuery, tagsQuery } from "./api";
import { FavoriteButton } from "./FavoriteButton";
import { useListHref } from "./lastListSearch";
import classes from "./RecipeActions.module.css";

// 詳細の操作のボタンと、確認の窓（D-01 削除・D-04 複製）。「作った」は作った記録のイシューで足す
export function RecipeActions({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const listHref = useListHref();
  const [copyOpened, copyDialog] = useDisclosure(false);
  const [deleteOpened, deleteDialog] = useDisclosure(false);
  const { id, name } = recipe;

  // 別の画面で消されていたときは、取り直して 404 の画面を出す
  const handleError = (error: Error) => {
    if (error instanceof ApiError && error.status === 404) {
      queryClient.invalidateQueries({ queryKey: recipeQuery(id).queryKey });
    }
  };

  const copy = useMutation({
    mutationFn: () => copyRecipe(id),
    onSuccess: (copied) => {
      queryClient.setQueryData(recipeQuery(copied.id).queryKey, copied);
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: tagsQuery.queryKey });
      notifications.show({ color: "green", message: "複製しました" });
      router.push(`/recipes/${copied.id}/edit?copied=1`);
    },
    onError: handleError,
  });

  // 詳細を開いたまま消すと、取り直して 404 の画面が一瞬出るので、画面を離れてから消す
  const deleted = useRef(false);
  useEffect(
    () => () => {
      if (deleted.current) {
        queryClient.removeQueries({ queryKey: recipeQuery(id).queryKey });
      }
    },
    [queryClient, id],
  );

  const remove = useMutation({
    mutationFn: () => deleteRecipe(id),
    onSuccess: () => {
      deleted.current = true;
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: tagsQuery.queryKey });
      notifications.show({
        color: "green",
        message: `「${name}」を削除しました`,
      });
      router.push(listHref);
    },
    onError: handleError,
  });

  return (
    <div className={classes.actions}>
      <FavoriteButton recipe={recipe} withLabel />
      <Button variant="default" component={Link} href={`/recipes/${id}/edit`}>
        編集
      </Button>
      <Button variant="default" onClick={copyDialog.open}>
        複製
      </Button>
      <Button variant="subtle" color="red" onClick={deleteDialog.open}>
        削除
      </Button>

      <Modal
        opened={copyOpened}
        onClose={copyDialog.close}
        title="このレシピを複製しますか？"
        centered
      >
        <Text>
          「{name}
          （コピー）」を作り、編集画面を開きます。お気に入りと作った記録はコピーしません。
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={copyDialog.close}>
            やめる
          </Button>
          <Button
            loading={copy.isPending || copy.isSuccess}
            onClick={() => copy.mutate()}
          >
            複製する
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={deleteOpened}
        onClose={deleteDialog.close}
        title="レシピを削除しますか？"
        centered
      >
        <Text>
          「{name}
          」を削除します。材料・作り方・作った記録・写真もすべて消え、元に戻せません。
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={deleteDialog.close}>
            やめる
          </Button>
          <Button
            color="red"
            loading={remove.isPending || remove.isSuccess}
            onClick={() => remove.mutate()}
          >
            削除する
          </Button>
        </Group>
      </Modal>
    </div>
  );
}
