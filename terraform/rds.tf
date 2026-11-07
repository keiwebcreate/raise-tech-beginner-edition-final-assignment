# RDS（AWS 構成設計書 5.3）。インターネットからは見えず、EC2 からだけつながる

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnets"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_c.id]

  tags = { Name = "${var.project_name}-db-subnets" }
}

# 文字コードと照合順序（テーブル設計書 1章）
resource "aws_db_parameter_group" "main" {
  name   = "${var.project_name}-mysql84"
  family = "mysql8.4"

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_ja_0900_as_cs"
  }
}

# DB のパスワード。ephemeral（その場限りの値）なので state に書かれない
ephemeral "random_password" "db" {
  length  = 32
  special = false # 英数字だけにして、接続の設定で記号の扱いに困らないようにする
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-db"
  engine         = "mysql"
  engine_version = "8.4"
  instance_class = var.db_instance_class

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username

  # write only（書き込むだけの項目）。AWS に送るだけで、state に書かれない。
  # パスワードを変えるときは、ssm.tf の value_wo_version と一緒に数字を増やす
  password_wo         = ephemeral.random_password.db.result
  password_wo_version = 1

  parameter_group_name   = aws_db_parameter_group.main.name
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  availability_zone      = "${var.region}a" # EC2 と同じ場所
  multi_az               = false
  publicly_accessible    = false

  backup_retention_period = 7
  copy_tags_to_snapshot   = true

  # 課題の提出後に全部消す方針なので、最後の写しは作らない
  skip_final_snapshot = true
  deletion_protection = false

  auto_minor_version_upgrade = true
  apply_immediately          = true

  tags = { Name = "${var.project_name}-db" }
}
