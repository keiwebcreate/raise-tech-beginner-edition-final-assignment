"use client";

import { Button, FileButton, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useEffect, useState } from "react";
import classes from "./RecipePhotoField.module.css";
import { PHOTO_TYPES, photoError } from "./recipeFormValues";

// 完成写真の欄（F-21・F-22）。写真があれば「写真を変える」「写真を削除」、なければ選ぶ場所を出す
export function RecipePhotoField({
  currentUrl,
  photo,
  removed,
  onSelect,
  onRemove,
  onError,
}: {
  // 今保存されている写真
  currentUrl: string | null;
  // 新しく選んだ写真
  photo: File | null;
  // 今の写真を消す印
  removed: boolean;
  onSelect: (photo: File) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (photo === null) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const pick = (file: File | null | undefined) => {
    if (!file) {
      return;
    }
    const message = photoError(file);
    if (message === null) {
      onSelect(file);
    } else {
      onError(message);
    }
  };

  const shownUrl = previewUrl ?? (removed ? null : currentUrl);

  if (shownUrl === null) {
    return (
      <Dropzone
        accept={[...PHOTO_TYPES]}
        multiple={false}
        // 種類の違うファイルも pick に渡し、理由を文言で知らせる
        onDrop={(files) => pick(files[0])}
        onReject={(rejections) => pick(rejections[0]?.file)}
        inputProps={{ "aria-label": "完成写真" }}
      >
        <div className={classes.drop}>
          <strong>写真をここにドラッグ＆ドロップ</strong>
          <span>または、押して選ぶ</span>
          <Text className={classes.hint}>JPEG・PNG・WebP、5MB まで</Text>
        </div>
      </Dropzone>
    );
  }

  return (
    <div className={classes.current}>
      {/* biome-ignore lint/performance/noImgElement: サーバーで縮小済みで、期限付きの URL なので Next.js の変換を通さない */}
      <img className={classes.photo} src={shownUrl} alt="完成写真" />
      <div className={classes.actions}>
        <FileButton accept={PHOTO_TYPES.join(",")} onChange={pick}>
          {(props) => (
            <Button variant="default" {...props}>
              写真を変える
            </Button>
          )}
        </FileButton>
        <Button variant="subtle" color="red" onClick={onRemove}>
          写真を削除
        </Button>
      </div>
    </div>
  );
}
