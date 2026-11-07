output "ec2_instance_id" {
  description = "Session Manager で入るときに指定する EC2 の ID"
  value       = aws_instance.app.id
}

output "ec2_public_dns" {
  description = "固定の IP アドレスの DNS 名（段階4で CloudFront の転送先にする）"
  value       = aws_eip.app.public_dns
}
