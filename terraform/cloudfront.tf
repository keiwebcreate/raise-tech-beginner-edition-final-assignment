# CloudFront（AWS 構成設計書 5.1）。HTTPS の入口になり、EC2 の80番へ転送する

# AWS が用意している設定
data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

# クッキー・URL の後ろの値・ヘッダーをすべて EC2 に渡す。
# CloudFront が付ける本当の接続元（CloudFront-Viewer-Address）も含む
data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewerAndCloudFrontHeaders-2022-06"
}

# CloudFront を通ったことを示す秘密のヘッダーの値。
# CloudFront の設定に書く必要があるので、state には残る（state は Git に入れない）
resource "random_password" "origin_secret" {
  length  = 40
  special = false
}

locals {
  origin_id = "ec2"
}

resource "aws_cloudfront_distribution" "main" {
  enabled         = true
  comment         = "Recipe Box"
  is_ipv6_enabled = false
  http_version    = "http2and3"
  # 日本とオーストラリアを含む範囲
  price_class = "PriceClass_200"

  origin {
    origin_id   = local.origin_id
    domain_name = aws_eip.app.public_dns

    custom_header {
      name  = "X-Origin-Verify"
      value = random_password.origin_secret.result
    }

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # 画面と /api は、ログインした人ごとに中身が違うので保存しない
  default_cache_behavior {
    target_origin_id         = local.origin_id
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
  }

  # 画面の部品のファイルは、名前が中身ごとに変わるので長く保存する
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # 独自ドメインは使わず、*.cloudfront.net の証明書を使う
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = { Name = "${var.project_name}-cdn" }
}
