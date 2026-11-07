# デプロイ専用の IAM ユーザー（AWS 構成設計書 6章）。
# 組織の制限で GitHub の OIDC が作れないので、このユーザーの鍵を GitHub の秘密の情報に登録する。
# 鍵は Terraform で作らない（state に秘密の値が残るため）。作り方は引き継ぎ資料を参照

resource "aws_iam_user" "deploy" {
  name = "${var.project_name}-deploy"

  # Terraform の外で作った鍵があっても、terraform destroy で一緒に消す
  force_destroy = true
}

data "aws_iam_policy_document" "deploy" {
  # ビルドしたファイルをデプロイ用バケットに置く
  statement {
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.main["deploy"].arn}/*"]
  }

  # この EC2 にだけ、シェルの命令を送る
  statement {
    actions = ["ssm:SendCommand"]
    resources = [
      aws_instance.app.arn,
      "arn:aws:ssm:${var.region}::document/AWS-RunShellScript",
    ]
  }

  # 命令の結果を見る。この2つは、対象を絞れない
  statement {
    actions   = ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"]
    resources = ["*"]
  }
}

resource "aws_iam_user_policy" "deploy" {
  name   = "${var.project_name}-deploy"
  user   = aws_iam_user.deploy.name
  policy = data.aws_iam_policy_document.deploy.json
}
