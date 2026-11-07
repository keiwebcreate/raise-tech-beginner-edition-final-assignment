output "ec2_instance_id" {
  description = "Session Manager で入るときに指定する EC2 の ID"
  value       = aws_instance.app.id
}

output "db_host" {
  description = "RDS の接続先。VPC の中からしか届かない"
  value       = aws_db_instance.main.address
}

output "photos_bucket" {
  description = "写真用のバケット"
  value       = aws_s3_bucket.main["photos"].bucket
}

output "deploy_bucket" {
  description = "デプロイ用のバケット"
  value       = aws_s3_bucket.main["deploy"].bucket
}

output "ec2_public_dns" {
  description = "固定の IP アドレスの DNS 名（段階4で CloudFront の転送先にする）"
  value       = aws_eip.app.public_dns
}
