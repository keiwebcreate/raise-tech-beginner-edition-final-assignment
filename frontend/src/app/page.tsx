import { Button, Container, Stack, Text, Title } from "@mantine/core";
import classes from "./page.module.css";

// 環境構築の確認用の仮の画面。レシピ一覧（S-02）を作るときに置き換える
export default function Home() {
  return (
    <Container size="sm" className={classes.page}>
      <Stack gap="md">
        <Title order={1}>Recipe Box</Title>
        <Text>自分だけのレシピノート（準備中）</Text>
        <div>
          <Button>蜜柑色のボタン</Button>
        </div>
      </Stack>
    </Container>
  );
}
