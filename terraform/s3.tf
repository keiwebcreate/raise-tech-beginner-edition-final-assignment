# S3（AWS 構成設計書 5.4）。どちらも公開しない。
# バケットの名前は世界で1つなので、アカウントの番号を付ける

data "aws_caller_identity" "current" {}

locals {
  buckets = {
    photos = "${var.project_name}-photos-${data.aws_caller_identity.current.account_id}"
    deploy = "${var.project_name}-deploy-${data.aws_caller_identity.current.account_id}"
  }
}

resource "aws_s3_bucket" "main" {
  for_each = local.buckets

  bucket = each.value

  # terraform destroy のときに中身ごと消す（課題の提出後に全部消す方針）
  force_destroy = true

  tags = { Name = each.value }
}

resource "aws_s3_bucket_public_access_block" "main" {
  for_each = aws_s3_bucket.main

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  for_each = aws_s3_bucket.main

  bucket = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# デプロイ用のファイルは、30日たったら自動で消す
resource "aws_s3_bucket_lifecycle_configuration" "deploy" {
  bucket = aws_s3_bucket.main["deploy"].id

  rule {
    id     = "expire-old-releases"
    status = "Enabled"

    filter {}

    expiration {
      days = 30
    }
  }
}
