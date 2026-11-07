# ネットワーク（AWS 構成設計書 3章）

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  # EC2 の固定の IP アドレスに付く DNS 名を使えるようにする（段階4で CloudFront の転送先にする）
  enable_dns_hostnames = true

  tags = { Name = "${var.project_name}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.project_name}-igw" }
}

# EC2 を置く場所。インターネットとやり取りできる
resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.region}a"

  # Systems Manager へつなぐために、EC2 の起動のときから外へ出られるようにする
  map_public_ip_on_launch = true

  tags = { Name = "${var.project_name}-public-a" }
}

# RDS を置く場所（段階2）。RDS は2つの場所（AZ）にサブネットを用意する決まりがある
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "${var.region}a"

  tags = { Name = "${var.project_name}-private-a" }
}

resource "aws_subnet" "private_c" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.12.0/24"
  availability_zone = "${var.region}c"

  tags = { Name = "${var.project_name}-private-c" }
}

# パブリックサブネットだけが、インターネットゲートウェイを通って外へ出られる。
# プライベートサブネットは VPC の既定の経路のままで、VPC の中にしか届かない
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.project_name}-public-rt" }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}
