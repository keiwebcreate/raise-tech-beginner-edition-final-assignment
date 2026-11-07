"use client";

import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  TagsInput,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import type { Category, Recipe } from "@/shared/api/types";
import {
  categoriesQuery,
  createRecipe,
  recipeQuery,
  tagsQuery,
  updateRecipe,
} from "./api";
import classes from "./RecipeForm.module.css";
import { RecipePhotoField } from "./RecipePhotoField";
import {
  initialRecipeFormValues,
  MAX_ROWS,
  newIngredientRow,
  newStepRow,
  type RecipeFormValues,
  recipeToFormValues,
  type SentRows,
  toFormErrors,
  toRecipeFormData,
} from "./recipeFormValues";
import { DragHandle, SortableRows } from "./SortableRows";

const SAVE_ERROR_MESSAGE =
  "保存できませんでした。時間をおいてもう一度お試しください";

// S-04 レシピ登録・S-05 レシピ編集（画面設計書 4章）。カテゴリを読み込んでからフォームを出す
export function RecipeForm({
  recipe,
  title = "レシピを追加",
}: {
  // 編集するレシピ。なければ登録
  recipe?: Recipe;
  title?: string;
}) {
  const categories = useQuery(categoriesQuery);
  const tags = useQuery(tagsQuery);

  if (categories.isError) {
    throw categories.error;
  }

  if (categories.isPending) {
    return <RecipeFormSkeleton title={title} />;
  }

  return (
    <RecipeFormFields
      recipe={recipe}
      title={title}
      categories={categories.data}
      tagNames={tags.data?.map((tag) => tag.name) ?? []}
    />
  );
}

export function RecipeFormSkeleton({ title }: { title: string }) {
  return (
    <div className={classes.container}>
      <h1 className={classes.title}>{title}</h1>
      <Skeleton height={480} radius="md" />
    </div>
  );
}

function RecipeFormFields({
  recipe,
  title,
  categories,
  tagNames,
}: {
  recipe: Recipe | undefined;
  title: string;
  categories: Category[];
  tagNames: string[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpened, confirm] = useDisclosure(false);
  const sentRows = useRef<SentRows>({ ingredients: [], steps: [] });

  const form = useForm<RecipeFormValues>({
    initialValues: recipe
      ? recipeToFormValues(recipe)
      : initialRecipeFormValues(),
  });
  // やめたら、編集は詳細へ、登録は一覧へ戻る（画面設計書 2章）
  const cancelHref = recipe ? `/recipes/${recipe.id}` : "/";

  const save = useMutation({
    mutationFn: (data: FormData) =>
      recipe ? updateRecipe(recipe.id, data) : createRecipe(data),
    onSuccess: (saved) => {
      queryClient.setQueryData(recipeQuery(saved.id).queryKey, saved);
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: tagsQuery.queryKey });
      notifications.show({ color: "green", message: "保存しました" });
      router.push(`/recipes/${saved.id}`);
    },
    onError: (error) => {
      // 401 は、共通の関数がログイン画面へ移す
      if (error instanceof ApiError && error.status === 401) {
        return;
      }
      if (error instanceof ApiError && error.status === 422) {
        setFormError(error.message);
        form.setErrors(toFormErrors(error.errors, sentRows.current));
        // 長いフォームなので、まとめの表示が見える所まで戻す
        window.scrollTo({ top: 0 });
        return;
      }
      notifications.show({
        color: "red",
        message: SAVE_ERROR_MESSAGE,
        autoClose: false,
      });
    },
  });

  function handleCancel() {
    if (form.isDirty()) {
      confirm.open();
    } else {
      router.push(cancelHref);
    }
  }

  const {
    ingredients,
    steps,
    photo,
    remove_photo: removePhoto,
  } = form.getValues();

  return (
    <>
      <form
        noValidate
        onSubmit={form.onSubmit((values) => {
          setFormError(null);
          form.clearErrors();
          const { data, sentRows: rows } = toRecipeFormData(values);
          sentRows.current = rows;
          save.mutate(data);
        })}
      >
        <div className={classes.container}>
          <h1 className={classes.title}>{title}</h1>
          {formError && (
            <Alert color="red" className={classes.alert}>
              {formError}
            </Alert>
          )}

          <div className={classes.sheet}>
            <section className={classes.part}>
              <Stack gap="md">
                <TextInput
                  label="料理名"
                  placeholder="例：肉じゃが"
                  size="md"
                  withAsterisk
                  {...form.getInputProps("name")}
                />
                <TextInput
                  label="よみがな"
                  placeholder="例：にくじゃが"
                  description="ひらがなで入れると、料理名順の並びと検索に使われます（なくてもよい）"
                  size="md"
                  {...form.getInputProps("name_kana")}
                />
                <div className={classes.three}>
                  <Select
                    label="カテゴリ"
                    placeholder="選んでください"
                    data={categories.map((category) => ({
                      value: String(category.id),
                      label: category.name,
                    }))}
                    allowDeselect={false}
                    size="md"
                    withAsterisk
                    className={classes.category}
                    {...form.getInputProps("category_id")}
                  />
                  <NumberInput
                    label="何人分"
                    min={1}
                    max={99}
                    allowDecimal={false}
                    allowNegative={false}
                    size="md"
                    withAsterisk
                    {...form.getInputProps("servings")}
                  />
                  <NumberInput
                    label="調理時間（分）"
                    placeholder="30"
                    min={1}
                    max={999}
                    allowDecimal={false}
                    allowNegative={false}
                    size="md"
                    {...form.getInputProps("cook_minutes")}
                  />
                </div>
                <TagsInput
                  label="タグ"
                  placeholder="タグを入力して Enter"
                  description="10個まで。今までに使ったタグが候補に出ます。新しい名前を入れると、新しいタグになります"
                  data={tagNames}
                  maxTags={10}
                  maxLength={20}
                  size="md"
                  {...form.getInputProps("tags")}
                />
              </Stack>
            </section>

            <section className={classes.part}>
              <SectionTitle>完成写真</SectionTitle>
              <RecipePhotoField
                currentUrl={recipe?.photo_url ?? null}
                photo={photo}
                removed={removePhoto}
                onSelect={(file) => {
                  form.clearFieldError("photo");
                  form.setValues({ photo: file, remove_photo: false });
                }}
                onRemove={() => {
                  form.clearFieldError("photo");
                  // 保存済みの写真があれば消す印を付ける。選んだだけの写真は取り消すだけ
                  form.setValues({
                    photo: null,
                    remove_photo: Boolean(recipe?.photo_url),
                  });
                }}
                onError={(message) => form.setFieldError("photo", message)}
              />
              <SectionError message={form.errors.photo} />
            </section>

            <section className={classes.part}>
              <SectionTitle required>材料</SectionTitle>
              <SortableRows
                items={ingredients}
                onMove={(from, to) =>
                  form.reorderListItem("ingredients", { from, to })
                }
                renderRow={(_row, index, handleRef) => (
                  <>
                    <DragHandle
                      handleRef={handleRef}
                      label={`材料${index + 1}を並び替える`}
                    />
                    <TextInput
                      aria-label={`材料名${index + 1}`}
                      placeholder="材料名（例：玉ねぎ）"
                      size="md"
                      className={classes.ingredientName}
                      {...form.getInputProps(`ingredients.${index}.name`)}
                    />
                    <TextInput
                      aria-label={`分量${index + 1}`}
                      placeholder="分量（例：1個）"
                      size="md"
                      className={classes.ingredientQuantity}
                      {...form.getInputProps(`ingredients.${index}.quantity`)}
                    />
                    <RemoveRowButton
                      label={`材料${index + 1}を削除`}
                      disabled={ingredients.length === 1}
                      onClick={() => form.removeListItem("ingredients", index)}
                    />
                  </>
                )}
              />
              <SectionError message={form.errors.ingredients} />
              <Button
                variant="default"
                disabled={ingredients.length >= MAX_ROWS}
                onClick={() =>
                  form.insertListItem("ingredients", newIngredientRow())
                }
              >
                ＋ 材料を追加
              </Button>
              <Text className={classes.hint}>
                50行まで。「少々」「適量」も書けます。左の ⋮⋮
                をドラッグすると並び替えられます
              </Text>
            </section>

            <section className={classes.part}>
              <SectionTitle required>作り方</SectionTitle>
              <SortableRows
                items={steps}
                onMove={(from, to) =>
                  form.reorderListItem("steps", { from, to })
                }
                renderRow={(_row, index, handleRef) => (
                  <>
                    <DragHandle
                      handleRef={handleRef}
                      label={`手順${index + 1}を並び替える`}
                    />
                    <span className={classes.stepNumber} aria-hidden="true">
                      {index + 1}
                    </span>
                    <Textarea
                      aria-label={`手順${index + 1}`}
                      placeholder="手順を入力"
                      autosize
                      minRows={2}
                      size="md"
                      className={classes.stepBody}
                      {...form.getInputProps(`steps.${index}.body`)}
                    />
                    <RemoveRowButton
                      label={`手順${index + 1}を削除`}
                      disabled={steps.length === 1}
                      onClick={() => form.removeListItem("steps", index)}
                    />
                  </>
                )}
              />
              <SectionError message={form.errors.steps} />
              <Button
                variant="default"
                disabled={steps.length >= MAX_ROWS}
                onClick={() => form.insertListItem("steps", newStepRow())}
              >
                ＋ 手順を追加
              </Button>
            </section>

            <section className={classes.part}>
              <SectionTitle>メモ</SectionTitle>
              <Textarea
                aria-label="メモ"
                placeholder="コツや、次に作るときに気をつけること"
                description="2000文字まで"
                inputWrapperOrder={["input", "description", "error"]}
                autosize
                minRows={3}
                size="md"
                {...form.getInputProps("memo")}
              />
            </section>
          </div>
        </div>

        <div className={classes.bottomBar}>
          <div className={classes.bottomInner}>
            <Button variant="default" onClick={handleCancel}>
              やめる
            </Button>
            <Button type="submit" loading={save.isPending || save.isSuccess}>
              保存する
            </Button>
          </div>
        </div>
      </form>

      <Modal
        opened={confirmOpened}
        onClose={confirm.close}
        title="変更を捨てますか？"
        centered
      >
        <Text>入力した内容は保存されません。</Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={confirm.close}>
            入力を続ける
          </Button>
          <Button color="red" onClick={() => router.push(cancelHref)}>
            変更を捨てる
          </Button>
        </Group>
      </Modal>
    </>
  );
}

function SectionTitle({
  required = false,
  children,
}: {
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <h2 className={classes.sectionTitle}>
      {children}
      {required && (
        <span className={classes.required} aria-hidden="true">
          *
        </span>
      )}
    </h2>
  );
}

function SectionError({ message }: { message: ReactNode }) {
  return message ? <Text className={classes.error}>{message}</Text> : null;
}

function RemoveRowButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size={42}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      ✕
    </ActionIcon>
  );
}
