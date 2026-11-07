# EC2 に付ける権限（AWS 構成設計書 6章）。
# 鍵ファイルを EC2 に置かず、この役割で AWS を使う

data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "${var.project_name}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# アプリとデプロイに要るものだけを許す
data "aws_iam_policy_document" "ec2_app" {
  # 写真の読み書きと削除
  statement {
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.main["photos"].arn}/*"]
  }

  # デプロイ用のファイルは読むだけ
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.main["deploy"].arn}/*"]
  }

  # ないファイルを 403 でなく 404 として扱うのに要る
  statement {
    actions   = ["s3:ListBucket"]
    resources = [for bucket in aws_s3_bucket.main : bucket.arn]
  }

  # デプロイのときに読む秘密の情報
  statement {
    actions = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
    resources = [
      "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${local.parameter_prefix}",
      "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${local.parameter_prefix}/*",
    ]
  }
}

resource "aws_iam_role_policy" "ec2_app" {
  name   = "${var.project_name}-ec2-app"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ec2_app.json
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}
