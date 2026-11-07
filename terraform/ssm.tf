# Parameter Store（AWS 構成設計書 5.5）。デプロイのたびに、EC2 がここから読んで .env を作る。
# 名前は Laravel の環境変数と同じにする。暗号化には AWS が管理する鍵（aws/ssm）を使う

locals {
  parameter_prefix = "/${var.project_name}/prod"

  parameters = {
    DB_HOST            = aws_db_instance.main.address
    DB_PORT            = tostring(aws_db_instance.main.port)
    DB_DATABASE        = var.db_name
    DB_USERNAME        = var.db_username
    AWS_BUCKET         = aws_s3_bucket.main["photos"].bucket
    AWS_DEFAULT_REGION = var.region

    APP_URL                  = "https://${aws_cloudfront_distribution.main.domain_name}"
    SANCTUM_STATEFUL_DOMAINS = aws_cloudfront_distribution.main.domain_name

    # Nginx が CloudFront からの要求かを確かめる値（deploy/deploy.sh）
    ORIGIN_SECRET = random_password.origin_secret.result
  }
}

resource "aws_ssm_parameter" "main" {
  # ORIGIN_SECRET が sensitive なので、キーの一覧だけを取り出して回す
  for_each = nonsensitive(toset(keys(local.parameters)))

  name  = "${local.parameter_prefix}/${each.key}"
  type  = "SecureString"
  value = local.parameters[each.key]
}

resource "aws_ssm_parameter" "db_password" {
  name = "${local.parameter_prefix}/DB_PASSWORD"
  type = "SecureString"

  # rds.tf と同じ値を、書き込むだけの項目で入れる。state に書かれない
  value_wo         = ephemeral.random_password.db.result
  value_wo_version = 1
}

# Laravel の暗号化の鍵。32文字を base64 にした形で渡す。state に書かれない
ephemeral "random_password" "app_key" {
  length  = 32
  special = false
}

resource "aws_ssm_parameter" "app_key" {
  name = "${local.parameter_prefix}/APP_KEY"
  type = "SecureString"

  value_wo         = "base64:${base64encode(ephemeral.random_password.app_key.result)}"
  value_wo_version = 1
}
