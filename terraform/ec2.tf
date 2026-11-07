# EC2（AWS 構成設計書 5.2）。Nginx・PHP・Node.js は、段階3のデプロイで入れる

# Amazon Linux 2023（ARM 用）の最新のイメージの ID を、AWS が公開している場所から読む
data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.al2023_arm64.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public_a.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  # サーバーの中から AWS の情報を読む仕組みは、安全な新しい方式（IMDSv2）だけにする
  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    encrypted             = true
    delete_on_termination = true
  }

  # イメージの最新版が出るたびに EC2 を作り直さないよう、作ったあとの変化は無視する
  lifecycle {
    ignore_changes = [ami]
  }

  tags = { Name = "${var.project_name}-app" }
}

# 固定の IP アドレス。EC2 を止めて動かしても住所が変わらない
resource "aws_eip" "app" {
  domain = "vpc"

  tags = { Name = "${var.project_name}-eip" }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}
