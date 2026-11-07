"use client";

import { Skeleton } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/shared/api/client";
import type { Recipe } from "@/shared/api/types";
import { recipeQuery } from "./api";
import { FavoriteButton } from "./FavoriteButton";
import { useListHref } from "./lastListSearch";
import classes from "./RecipeDetail.module.css";

// S-03 レシピ詳細（画面設計書 4章）。残りの操作のボタンは、それぞれの機能のイシューで足す
export function RecipeDetail({ id }: { id: number }) {
  const { data: recipe, error } = useQuery(recipeQuery(id));
  const listHref = useListHref();

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    // 401 は、共通の関数がログイン画面へ移す
    if (!(error instanceof ApiError && error.status === 401)) {
      throw error;
    }
  }

  return (
    <main className={classes.container}>
      <Link href={listHref} className={classes.back}>
        一覧に戻る
      </Link>
      {recipe ? (
        <RecipeSheet recipe={recipe} />
      ) : (
        <Skeleton height={480} radius="md" />
      )}
    </main>
  );
}

function RecipeSheet({ recipe }: { recipe: Recipe }) {
  return (
    <article className={classes.sheet}>
      <header className={classes.head}>
        <div className={classes.titleRow}>
          <h1 className={classes.name}>{recipe.name}</h1>
          <FavoriteButton recipe={recipe} withLabel />
        </div>
        <div className={classes.meta}>
          <span className={classes.category}>{recipe.category.name}</span>
          {recipe.cook_minutes !== null && (
            <span className={classes.minutes}>
              調理時間 <b>{recipe.cook_minutes}</b>分
            </span>
          )}
          {recipe.tags.length > 0 && (
            <span className={classes.tags}>
              {recipe.tags.map((tag) => (
                <span key={tag.id}>#{tag.name}</span>
              ))}
            </span>
          )}
        </div>
      </header>

      <div className={classes.layout}>
        <div>
          <div className={classes.noImage}>写真なし</div>
          <section className={classes.ingredientsSection}>
            <h2 className={classes.sectionTitle}>
              材料
              <span className={classes.servings}>{recipe.servings}人分</span>
            </h2>
            <ul className={classes.ingredients}>
              {recipe.ingredients.map((ingredient, index) => (
                // 同じ名前の材料もあるので、順番を key にする。並びは保存した順で変わらない
                // biome-ignore lint/suspicious/noArrayIndexKey: 表示だけで並びが変わらない
                <li key={index}>
                  <span className={classes.ingredientName}>
                    {ingredient.name}
                  </span>
                  {ingredient.quantity && (
                    <>
                      <span className={classes.leader} aria-hidden="true" />
                      <span className={classes.quantity}>
                        {ingredient.quantity}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div>
          <section>
            <h2 className={classes.sectionTitle}>作り方</h2>
            <ol className={classes.steps}>
              {recipe.steps.map((step, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: 表示だけで並びが変わらない
                <li key={index}>{step.body}</li>
              ))}
            </ol>
          </section>

          {recipe.memo && (
            <section className={classes.sub}>
              <h2 className={classes.sectionTitle}>メモ</h2>
              <p className={classes.memo}>{recipe.memo}</p>
            </section>
          )}

          <CookingSection cooking={recipe.cooking} />
        </div>
      </div>
    </article>
  );
}

function CookingSection({ cooking }: { cooking: Recipe["cooking"] }) {
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
          {cooking.recent_logs.map((log) => (
            <li key={log.id}>
              <time dateTime={log.cooked_on}>
                {log.cooked_on.replaceAll("-", "/")}
              </time>
              <p>{log.note}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// 2026-11-03 → 11/3
function shortDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}
