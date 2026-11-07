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
