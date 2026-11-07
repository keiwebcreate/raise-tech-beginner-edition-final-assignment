"use client";

import {
  Button,
  Checkbox,
  Drawer,
  NativeSelect,
  Pagination,
  Skeleton,
  TextInput,
  VisuallyHidden,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import type {
  Category,
  Paginated,
  RecipeListItem,
  Tag,
} from "@/shared/api/types";
import { categoriesQuery, recipesQuery, tagsQuery } from "./api";
import { FavoriteButton } from "./FavoriteButton";
import { rememberListSearch } from "./lastListSearch";
import classes from "./RecipeList.module.css";
import {
  countFilters,
  hasConditions,
  MAX_MINUTES_OPTIONS,
  type MaxMinutes,
  NO_FILTERS,
  normalizeKeyword,
  parseRecipeSearch,
  RECIPE_SORTS,
  type RecipeFilters,
  type RecipeSearch,
  type RecipeSort,
  toSearchString,
} from "./recipeSearch";

const KEYWORD_WAIT_MS = 300;

type View = "tile" | "list";

// 条件を URL に入れて覚える。pushState は Next.js の useSearchParams に伝わるので、
// サーバーに画面を取りに行かず、すぐに切り替わる。ブラウザの「戻る」も効く
function changeSearch(
  change: Partial<RecipeSearch>,
  how: "push" | "replace" = "push",
): void {
  const current = parseRecipeSearch(
    new URLSearchParams(window.location.search),
  );
  // 条件を変えたら1ページ目に戻す（詳細設計書 5.6）
  const search = toSearchString({ ...current, page: 1, ...change });
  const url = `${window.location.pathname}${search}`;

  if (how === "push") {
    window.history.pushState(null, "", url);
  } else {
    window.history.replaceState(null, "", url);
  }
}

// S-02 レシピ一覧（画面設計書 4章）
export function RecipeList() {
  const search = parseRecipeSearch(useSearchParams());
  const searchString = toSearchString(search);
  const { data, error, isPlaceholderData } = useQuery(recipesQuery(search));
  // 条件をクリアしたら、入力の途中の文字も捨てる
  const [keywordResetKey, setKeywordResetKey] = useState(0);
  const [view, setView] = useLocalStorage<View>({
    key: "recipe-box:list-view",
    defaultValue: "tile",
  });

  useEffect(() => {
    rememberListSearch(searchString);
  }, [searchString]);

  // レシピが減るなどして、ないページを開いたときは最後のページへ移す
  const lastPage = data?.meta.last_page;
  useEffect(() => {
    if (
      lastPage !== undefined &&
      !isPlaceholderData &&
      search.page > lastPage
    ) {
      changeSearch({ page: lastPage }, "replace");
    }
  }, [lastPage, isPlaceholderData, search.page]);

  // 表示できるものがあるときは、取り直しに失敗してもそのまま見せる
  if (error && !data) {
    // 401 は、共通の関数がログイン画面へ移す
    if (!(error instanceof ApiError && error.status === 401)) {
      throw error;
    }
  }

  const clearConditions = () => {
    setKeywordResetKey((key) => key + 1);
    changeSearch({ ...NO_FILTERS, q: "" });
  };

  return (
    <main className={classes.container}>
      <VisuallyHidden component="h1">レシピ一覧</VisuallyHidden>

      <SearchPanel
        search={search}
        keywordResetKey={keywordResetKey}
        onClear={clearConditions}
      />

      <div className={classes.toolbar}>
        <Summary search={search} data={data} />
        <NativeSelect
          className={classes.sort}
          aria-label="並び替え"
          value={search.sort}
          data={[...RECIPE_SORTS]}
          onChange={(event) =>
            changeSearch({ sort: event.currentTarget.value as RecipeSort })
          }
        />
        <div className={classes.viewSwitch}>
          <button
            type="button"
            aria-label="タイル表示"
            title="タイル表示"
            aria-pressed={view !== "list"}
            onClick={() => setView("tile")}
          >
            ▦
          </button>
          <button
            type="button"
            aria-label="リスト表示"
            title="リスト表示"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            ☰
          </button>
        </div>
      </div>

      {data ? (
        <Results
          data={data}
          search={search}
          view={view}
          busy={isPlaceholderData}
          onClear={clearConditions}
        />
      ) : (
        <ListSkeleton />
      )}
    </main>
  );
}

// 画面を開いた直後（検索条件を読む前も含む）に出す仮の表示
export function ListSkeleton() {
  return (
    <div className={classes.grid}>
      {Array.from({ length: 8 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 中身のない仮の表示
        <Skeleton key={index} className={classes.skeleton} radius="md" />
      ))}
    </div>
  );
}

function SearchPanel({
  search,
  keywordResetKey,
  onClear,
}: {
  search: RecipeSearch;
  keywordResetKey: number;
  onClear: () => void;
}) {
  const [drawerOpened, setDrawerOpened] = useState(false);
  const filterCount = countFilters(search);

  return (
    <section aria-label="検索と絞り込み">
      <div className={classes.keywordRow}>
        <KeywordInput key={keywordResetKey} value={search.q} />
        <div className={classes.mobileOnly}>
          <Button
            variant="default"
            size="md"
            onClick={() => setDrawerOpened(true)}
          >
            絞り込み ({filterCount})
          </Button>
        </div>
      </div>

      <div className={classes.filterRow}>
        <FilterFields
          values={search}
          onChange={(change) => changeSearch(change)}
        />
        <Button variant="subtle" color="gray" onClick={onClear}>
          条件をクリア
        </Button>
      </div>

      <FilterDrawer
        opened={drawerOpened}
        filters={search}
        onClose={() => setDrawerOpened(false)}
      />
    </section>
  );
}

// キーワードは入力が止まってから検索する（詳細設計書 5.6）
function KeywordInput({ value }: { value: string }) {
  const [text, setText] = useState(value);
  const committed = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const composing = useRef(false);

  // 「戻る」などで URL のほうが変わったときだけ、入力欄を合わせる
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      clearTimeout(timer.current);
      setText(value);
    }
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (keyword: string) => {
    clearTimeout(timer.current);
    const q = normalizeKeyword(keyword);
    if (q !== committed.current) {
      committed.current = q;
      // 1文字ごとに履歴を増やさない
      changeSearch({ q }, "replace");
    }
  };

  const schedule = (keyword: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(keyword), KEYWORD_WAIT_MS);
  };

  return (
    <TextInput
      className={classes.keyword}
      type="search"
      size="md"
      radius="xl"
      aria-label="料理名や材料で探す"
      placeholder="料理名や材料で探す（例：豚肉）"
      maxLength={100}
      value={text}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setText(next);
        // 日本語の変換中は検索しない
        if (composing.current) {
          clearTimeout(timer.current);
        } else {
          schedule(next);
        }
      }}
      onCompositionStart={() => {
        composing.current = true;
        clearTimeout(timer.current);
      }}
      onCompositionEnd={(event) => {
        composing.current = false;
        schedule(event.currentTarget.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
          commit(event.currentTarget.value);
        }
      }}
    />
  );
}

function FilterFields({
  values,
  onChange,
  inDrawer = false,
}: {
  values: RecipeFilters;
  onChange: (change: Partial<RecipeFilters>) => void;
  inDrawer?: boolean;
}) {
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: tags = [] } = useQuery(tagsQuery);

  // 絞り込みの窓には項目名が出るので、選択肢に項目名を書かない
  const labelProps = (name: string) =>
    inDrawer ? { label: name } : { "aria-label": name };
  const allLabel = (name: string, all: string) =>
    inDrawer ? all : `${name}：${all}`;

  return (
    <>
      <NativeSelect
        {...labelProps("カテゴリ")}
        value={values.categoryId ?? ""}
        data={[
          { value: "", label: allLabel("カテゴリ", "すべて") },
          ...toOptions(categories),
        ]}
        onChange={(event) =>
          onChange({ categoryId: toId(event.currentTarget.value) })
        }
      />
      <NativeSelect
        {...labelProps("タグ")}
        value={values.tagId ?? ""}
        data={[
          { value: "", label: allLabel("タグ", "すべて") },
          ...toOptions(tags),
        ]}
        onChange={(event) =>
          onChange({ tagId: toId(event.currentTarget.value) })
        }
      />
      <NativeSelect
        {...labelProps("調理時間")}
        value={values.maxMinutes ?? ""}
        data={[
          { value: "", label: allLabel("調理時間", "指定なし") },
          ...MAX_MINUTES_OPTIONS.map((minutes) => ({
            value: String(minutes),
            label: `${minutes}分以内`,
          })),
        ]}
        onChange={(event) =>
          onChange({
            maxMinutes: toId(event.currentTarget.value) as MaxMinutes | null,
          })
        }
      />
      {inDrawer ? (
        <Checkbox
          label="お気に入りだけ"
          checked={values.favorite}
          onChange={(event) =>
            onChange({ favorite: event.currentTarget.checked })
          }
        />
      ) : (
        <Button
          variant={values.favorite ? "light" : "default"}
          aria-pressed={values.favorite}
          onClick={() => onChange({ favorite: !values.favorite })}
        >
          ★ お気に入りだけ
        </Button>
      )}
    </>
  );
}

// スマホの絞り込み（下から出る窓）。「この条件で表示」を押したら反映する
function FilterDrawer({
  opened,
  filters,
  onClose,
}: {
  opened: boolean;
  filters: RecipeFilters;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<RecipeFilters>(NO_FILTERS);

  // 開くたびに、今の条件から始める
  const { categoryId, tagId, favorite, maxMinutes } = filters;
  useEffect(() => {
    if (opened) {
      setDraft({ categoryId, tagId, favorite, maxMinutes });
    }
  }, [opened, categoryId, tagId, favorite, maxMinutes]);

  const apply = (next: RecipeFilters) => {
    changeSearch(next);
    onClose();
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      classNames={{ content: classes.drawerContent }}
      title="絞り込み"
      closeButtonProps={{ "aria-label": "閉じる" }}
    >
      <div className={classes.drawerBody}>
        <FilterFields
          inDrawer
          values={draft}
          onChange={(change) => setDraft({ ...draft, ...change })}
        />
        <div className={classes.drawerActions}>
          <Button variant="default" onClick={() => apply(NO_FILTERS)}>
            クリア
          </Button>
          <Button className={classes.drawerApply} onClick={() => apply(draft)}>
            この条件で表示
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

// 「主菜 ｜ 24件中 1〜20件」
function Summary({
  search,
  data,
}: {
  search: RecipeSearch;
  data: Paginated<RecipeListItem> | undefined;
}) {
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: tags = [] } = useQuery(tagsQuery);

  const labels = [
    search.q && `「${search.q}」`,
    categories.find((category) => category.id === search.categoryId)?.name,
    tags.find((tag) => tag.id === search.tagId)?.name,
    search.maxMinutes && `${search.maxMinutes}分以内`,
    search.favorite && "お気に入り",
  ].filter(Boolean);

  return (
    <p className={classes.count} role="status">
      {labels.length > 0 && <b>{labels.join(" ")}</b>}
      {data && countText(data)}
    </p>
  );
}

function countText({ meta }: Paginated<RecipeListItem>): string {
  return meta.total === 0
    ? "0件"
    : `${meta.total}件中 ${meta.from}〜${meta.to}件`;
}

function Results({
  data,
  search,
  view,
  busy,
  onClear,
}: {
  data: Paginated<RecipeListItem>;
  search: RecipeSearch;
  view: View;
  busy: boolean;
  onClear: () => void;
}) {
  if (data.data.length === 0) {
    return <Empty search={search} total={data.meta.total} onClear={onClear} />;
  }

  return (
    <div aria-busy={busy}>
      <ul className={view === "list" ? classes.list : classes.grid}>
        {data.data.map((recipe) => (
          <li key={recipe.id}>
            {view === "list" ? (
              <RecipeRow recipe={recipe} />
            ) : (
              <RecipeTile recipe={recipe} />
            )}
          </li>
        ))}
      </ul>

      {data.meta.last_page > 1 && (
        <Pagination
          className={classes.pager}
          total={data.meta.last_page}
          value={data.meta.current_page}
          onChange={(page) => {
            changeSearch({ page });
            window.scrollTo({ top: 0 });
          }}
          getItemProps={(page) => ({
            "aria-label": `${page}ページ目`,
            "aria-current":
              page === data.meta.current_page ? "page" : undefined,
          })}
          getControlProps={(control) => {
            if (control === "previous") return { "aria-label": "前のページ" };
            if (control === "next") return { "aria-label": "次のページ" };
            return {};
          }}
        />
      )}
    </div>
  );
}

function Empty({
  search,
  total,
  onClear,
}: {
  search: RecipeSearch;
  total: number;
  onClear: () => void;
}) {
  // 別のページの空振りは、すぐ最後のページへ移るので何も出さない
  if (total > 0) {
    return <ListSkeleton />;
  }

  if (!hasConditions(search)) {
    return (
      <div className={classes.empty}>
        <h2>最初のレシピを追加しましょう</h2>
        <p>料理名と材料、作り方を書くと、ここに並びます。</p>
        <Button component={Link} href="/recipes/new">
          レシピを追加する
        </Button>
      </div>
    );
  }

  return (
    <div className={classes.empty}>
      <h2>条件に合うレシピがありません</h2>
      <p>キーワードを短くするか、絞り込みの条件を外してください。</p>
      <div className={classes.emptyActions}>
        <Button variant="default" onClick={onClear}>
          条件をクリア
        </Button>
        <Button component={Link} href="/recipes/new">
          レシピを追加する
        </Button>
      </div>
    </div>
  );
}

function RecipeTile({ recipe }: { recipe: RecipeListItem }) {
  return (
    <div className={classes.tile}>
      {/* 1画面に並ぶ全部のレシピを、先読みしない */}
      <Link
        href={`/recipes/${recipe.id}`}
        prefetch={false}
        className={classes.link}
      >
        <NoImage />
        <h2 className={classes.title}>{recipe.name}</h2>
        <Meta recipe={recipe} />
        <TagList tags={recipe.tags} className={classes.tileTags} />
      </Link>
      <div className={classes.tileFavorite}>
        <FavoriteButton recipe={recipe} />
      </div>
    </div>
  );
}

function RecipeRow({ recipe }: { recipe: RecipeListItem }) {
  return (
    <div className={classes.row}>
      <Link
        href={`/recipes/${recipe.id}`}
        prefetch={false}
        className={classes.rowLink}
      >
        <div className={classes.thumb}>
          <NoImage />
        </div>
        <div className={classes.rowMain}>
          <h2 className={classes.rowTitle}>{recipe.name}</h2>
          <Meta recipe={recipe} />
          <TagList tags={recipe.tags} />
        </div>
      </Link>
      <FavoriteButton recipe={recipe} />
    </div>
  );
}

// 写真は写真のイシューで足す
function NoImage() {
  return <div className={classes.noImage}>写真なし</div>;
}

function Meta({ recipe }: { recipe: RecipeListItem }) {
  return (
    <div className={classes.meta}>
      <span className={classes.category}>{recipe.category.name}</span>
      {recipe.cook_minutes !== null && (
        <span className={classes.minutes}>
          <b>{recipe.cook_minutes}</b>分
        </span>
      )}
    </div>
  );
}

function TagList({ tags, className }: { tags: Tag[]; className?: string }) {
  if (tags.length === 0) {
    return null;
  }
  return (
    <div className={`${classes.tags} ${className ?? ""}`}>
      {tags.map((tag) => (
        <span key={tag.id}>#{tag.name}</span>
      ))}
    </div>
  );
}

function toOptions(items: Pick<Category, "id" | "name">[]) {
  return items.map((item) => ({ value: String(item.id), label: item.name }));
}

function toId(value: string): number | null {
  return value === "" ? null : Number(value);
}
