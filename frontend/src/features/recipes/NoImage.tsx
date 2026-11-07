import classes from "./NoImage.module.css";

// 写真がないときの画像（F-23）。色は文字の色に合わせるので、ライトとダークの両方で見える。
// compact：一覧のリストの小さな枠では、文字が読めないので絵だけにする
export function NoImage({ compact = false }: { compact?: boolean }) {
  return (
    <div className={classes.frame}>
      <svg
        className={classes.image}
        viewBox="0 0 120 90"
        role="img"
        aria-label="写真なし"
      >
        <title>写真なし</title>
        {/* 皿 */}
        <g fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="60" cy="36" r="21" />
          <circle cx="60" cy="36" r="13" opacity="0.5" />
          {/* フォーク */}
          <path
            d="M27 20v9a3.5 3.5 0 0 0 7 0v-9M30.5 20v32"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* ナイフ */}
          <path
            d="M91 52V20c3.5 2 5.5 7 5.5 13 0 2.5-1.500 4-5.500 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        {!compact && (
          <text
            x="60"
            y="78"
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fill="currentColor"
          >
            No Image
          </text>
        )}
      </svg>
    </div>
  );
}
