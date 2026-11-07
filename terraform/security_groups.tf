# 通信の許可（AWS 構成設計書 4章）。書いていない通信は通さない。
# ポート22 は開けない（EC2 へは Session Manager で入る）

resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg"
  description = "Recipe app EC2: HTTP from CloudFront only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.project_name}-ec2-sg" }
}

# AWS が用意している、CloudFront が EC2 へつなぐときに使うアドレスの一覧
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_vpc_security_group_ingress_rule" "http_from_cloudfront" {
  security_group_id = aws_security_group.ec2.id
  description       = "HTTP from CloudFront"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
}

# 外へ出る通信はすべて許す（Systems Manager・S3・パッケージの取得に使う）
resource "aws_vpc_security_group_egress_rule" "all_out" {
  security_group_id = aws_security_group.ec2.id
  description       = "All outbound"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# RDS は、EC2 のセキュリティグループが付いたものからだけ受ける。
# RDS から外へ出る通信は必要ないので書かない
resource "aws_security_group" "db" {
  name        = "${var.project_name}-db-sg"
  description = "Recipe app RDS: MySQL from the app EC2 only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.project_name}-db-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "db_from_ec2" {
  security_group_id            = aws_security_group.db.id
  description                  = "MySQL from the app EC2"
  ip_protocol                  = "tcp"
  from_port                    = 3306
  to_port                      = 3306
  referenced_security_group_id = aws_security_group.ec2.id
}
