import classes from "./Logo.module.css";

// ロゴ：ノートのしおりの形の印と「Recipe Box」の文字（画面設計書 3.3）
export function Logo() {
  return (
    <span className={classes.logo}>
      <span className={classes.mark} aria-hidden="true" />
      Recipe Box
    </span>
  );
}
