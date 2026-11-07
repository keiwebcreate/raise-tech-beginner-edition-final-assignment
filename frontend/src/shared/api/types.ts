// API の型（API 設計書のとおり）

export type Category = {
  id: number;
  name: string;
};

export type Tag = {
  id: number;
  name: string;
  // タグの一覧（A-07）のときだけ入る
  recipes_count?: number;
};

export type CookingLog = {
  id: number;
  cooked_on: string;
  note: string | null;
};

// ページ分けされた一覧の形（API 設計書 1.4）
export type Paginated<T> = {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
};

// 一覧の1件（A-08）
export type RecipeListItem = {
  id: number;
  name: string;
  category: Category;
  cook_minutes: number | null;
  tags: Tag[];
  is_favorite: boolean;
  thumb_url: string | null;
  last_cooked_on: string | null;
};

export type Recipe = {
  id: number;
  name: string;
  name_kana: string | null;
  category: Category;
  servings: number;
  cook_minutes: number | null;
  memo: string | null;
  is_favorite: boolean;
  photo_url: string | null;
  thumb_url: string | null;
  tags: Tag[];
  ingredients: { name: string; quantity: string | null }[];
  steps: { body: string }[];
  cooking: {
    count: number;
    last_cooked_on: string | null;
    recent_logs: CookingLog[];
  };
  created_at: string;
  updated_at: string;
};
