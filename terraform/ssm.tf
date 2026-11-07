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
  }
}

resource "aws_ssm_parameter" "main" {
  for_each = local.parameters

  name  = "${local.parameter_prefix}/${each.key}"
  type  = "SecureString"
  value = each.value
}

resource "aws_ssm_parameter" "db_password" {
  name = "${local.parameter_prefix}/DB_PASSWORD"
  type = "SecureString"

  # rds.tf と同じ値を、書き込むだけの項目で入れる。state に書かれない
  value_wo         = ephemeral.random_password.db.result
  value_wo_version = 1
}
